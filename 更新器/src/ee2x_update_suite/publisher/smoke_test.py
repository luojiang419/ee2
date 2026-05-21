from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests

from ee2x_update_suite.publisher.http_backend import (
    delete_release_http,
    fetch_release_history,
    fetch_remote_latest,
    load_publish_config,
    publish_bundle_http,
    publish_release_http,
)
from ee2x_update_suite.shared.constants import LAUNCHER_DIR_NAME, PACKAGE_SCOPE_ALL, PACKAGE_SCOPE_GAME, PACKAGE_SCOPE_LAUNCHER, RELEASE_STATE_NAME, ROOT_DIR_NAME
from ee2x_update_suite.shared.json_utils import load_json
from ee2x_update_suite.shared.manifest_builder import create_dual_release_bundle, write_release_bundle_zip


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="EE2X HTTP 双包发布与接收端到端烟雾测试")
    parser.add_argument("--config", required=True, help="publish.local.json 路径")
    parser.add_argument("--channel", default="", help="测试频道名，不传则自动生成")
    return parser.parse_args()


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_launcher_stub(launcher_exe: Path, args_file: Path) -> None:
    launcher_exe.parent.mkdir(parents=True, exist_ok=True)
    launcher_exe.write_text(
        "#!/usr/bin/env sh\n"
        f"printf '%s\\n' \"$@\" > \"{args_file}\"\n"
        "exit 0\n",
        encoding="utf-8",
    )
    launcher_exe.chmod(0o755)


def _make_publish_config(target: Path, *, backend_base_url: str, admin_username: str, admin_password: str, channel: str) -> Path:
    payload = {
        "backendBaseUrl": backend_base_url,
        "adminUsername": admin_username,
        "adminPassword": admin_password,
        "channel": channel,
    }
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return target


def _run_headless_update(
    *,
    workspace_root: Path,
    target_root: Path,
    launcher_dir: Path,
    launcher_exe: Path,
    server_base: str,
    channel: str,
    scope: str,
) -> dict:
    env = dict(**subprocess.os.environ)
    env["PYTHONPATH"] = str(Path(__file__).resolve().parents[2])
    cmd = [
        "python3",
        "-m",
        "ee2x_update_suite.updater_gui",
        "--headless",
        "--root",
        str(target_root),
        "--launcher-dir",
        str(launcher_dir),
        "--launcher-exe",
        str(launcher_exe),
        "--server-base",
        server_base,
        "--channel",
        channel,
        "--scope",
        scope,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, env=env, cwd=str(workspace_root))
    stdout = proc.stdout.strip()
    if stdout:
        payload = json.loads(stdout)
    else:
        payload = {"ok": proc.returncode == 0, "stderr": proc.stderr.strip()}
    if proc.returncode != 0 or payload.get("ok") is not True:
        raise RuntimeError(f"{scope} 接收更新失败: {payload} stderr={proc.stderr.strip()}")
    return payload


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def _fetch_json(url: str, expected_status: int = 200) -> dict:
    response = requests.get(url, timeout=20)
    _assert(response.status_code == expected_status, f"请求 {url} 返回 {response.status_code}，期望 {expected_status}")
    if expected_status == 200:
        return response.json()
    return {}


def _wait_for_restart_marker(args_file: Path, timeout_seconds: float = 3.0) -> str:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if args_file.exists():
            return args_file.read_text(encoding="utf-8").strip()
        time.sleep(0.1)
    raise RuntimeError("未检测到启动器重启标记文件。")


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _start_local_backend(*, workspace_root: Path, channel: str, admin_username: str, admin_password: str) -> tuple[subprocess.Popen[str], str]:
    updater_root = Path(__file__).resolve().parents[3]
    backend_root = workspace_root / "local-backend"
    port = _find_free_port()
    env = dict(os.environ)
    env.update(
        {
            "EE2X_UPDATE_HOST": "127.0.0.1",
            "EE2X_UPDATE_PORT": str(port),
            "EE2X_UPDATE_DEFAULT_CHANNEL": channel,
            "EE2X_UPDATE_ADMIN_USERNAME": admin_username,
            "EE2X_UPDATE_ADMIN_PASSWORD": admin_password,
            "EE2X_UPDATE_STATIC_BASE_URL": f"http://127.0.0.1:{port}",
            "EE2X_UPDATE_STORAGE_UPDATES_DIR": str(backend_root / "storage" / "updates"),
            "EE2X_UPDATE_STORAGE_TMP_DIR": str(backend_root / "storage" / "tmp"),
            "EE2X_UPDATE_DB_PATH": str(backend_root / "db" / "update_service.sqlite3"),
        }
    )
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=str(updater_root / "update_backend_mg"),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    health_url = f"http://127.0.0.1:{port}/api/update/v1/health"
    deadline = time.time() + 15
    last_error = ""
    while time.time() < deadline:
        if process.poll() is not None:
            stderr_text = process.stderr.read().strip() if process.stderr else ""
            raise RuntimeError(f"本地后端提前退出: {stderr_text}")
        try:
            response = requests.get(health_url, timeout=1)
            if response.status_code == 200:
                return process, f"http://127.0.0.1:{port}"
            last_error = f"HTTP {response.status_code}"
        except Exception as exc:
            last_error = str(exc)
        time.sleep(0.2)
    _stop_process(process)
    raise RuntimeError(f"本地后端未能在时限内启动: {last_error}")


def _stop_process(process: subprocess.Popen[str]) -> str:
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    stdout_text = process.stdout.read().strip() if process.stdout else ""
    stderr_text = process.stderr.read().strip() if process.stderr else ""
    return "\n".join(part for part in (stdout_text, stderr_text) if part)


def main() -> None:
    args = parse_args()
    base_config = load_publish_config(Path(args.config).resolve())
    channel = str(args.channel or f"codex-http-smoke-{int(time.time())}").strip()

    workspace = Path(tempfile.mkdtemp(prefix="ee2x-http-smoke-"))
    try:
        source_root = workspace / "source" / ROOT_DIR_NAME
        target_root = workspace / "target" / ROOT_DIR_NAME
        release_root = workspace / "releases"
        launcher_source_payload_dir = source_root / LAUNCHER_DIR_NAME / "smoke-launcher"
        game_source_payload_dir = source_root / "smoke-game"
        launcher_dir = target_root / LAUNCHER_DIR_NAME
        launcher_exe = launcher_dir / f"{LAUNCHER_DIR_NAME}.exe"
        launcher_args_file = launcher_dir / "launcher-restarted.args"
        release_state_path = launcher_dir / "update" / "runtime" / RELEASE_STATE_NAME
        smoke_backend_process, smoke_backend_base_url = _start_local_backend(
            workspace_root=workspace,
            channel=channel,
            admin_username=base_config.adminUsername,
            admin_password=base_config.adminPassword,
        )
        try:
            smoke_config_path = _make_publish_config(
                workspace / "publish-smoke.json",
                backend_base_url=smoke_backend_base_url,
                admin_username=base_config.adminUsername,
                admin_password=base_config.adminPassword,
                channel=channel,
            )

            _write_launcher_stub(launcher_exe, launcher_args_file)

            launcher_live_rel = "smoke-launcher/live.txt"
            launcher_obsolete_rel = "smoke-launcher/obsolete.txt"
            game_live_rel = "smoke-game/live.txt"
            game_obsolete_rel = "smoke-game/obsolete.txt"

            def write_source_payload(version: str, *, include_obsolete: bool) -> None:
                if launcher_source_payload_dir.exists():
                    shutil.rmtree(launcher_source_payload_dir)
                if game_source_payload_dir.exists():
                    shutil.rmtree(game_source_payload_dir)
                _write_text(launcher_source_payload_dir / "live.txt", f"launcher-{version}\n")
                _write_text(game_source_payload_dir / "live.txt", f"game-{version}\n")
                if include_obsolete:
                    _write_text(launcher_source_payload_dir / "obsolete.txt", f"launcher-obsolete-{version}\n")
                    _write_text(game_source_payload_dir / "obsolete.txt", f"game-obsolete-{version}\n")

            def create_release(version: str, notes: str) -> Path:
                release_dir, _manifests, validation = create_dual_release_bundle(
                    game_root=source_root,
                    version=version,
                    release_notes=notes,
                    selected_paths=[launcher_source_payload_dir, game_source_payload_dir],
                    delete_list=[],
                    output_root=release_root,
                    allow_override=False,
                )
                if validation.has_errors:
                    raise RuntimeError(validation.to_text())
                return release_dir

            def export_bundle(version: str, notes: str) -> Path:
                release_dir = create_release(version, notes)
                bundle_path = workspace / f"EE2X-release-{version}.zip"
                write_release_bundle_zip(release_dir, bundle_path)
                _assert(bundle_path.exists(), f"{version} bundle 未生成")
                return bundle_path

            def publish_version(version: str, *, include_obsolete: bool) -> dict:
                write_source_payload(version, include_obsolete=include_obsolete)
                release_dir = create_release(version, f"Smoke publish {version}")
                payload = publish_release_http(release_dir, smoke_config_path)
                _assert(payload.get("ok") is True, f"发布 {version} 失败: {payload}")
                return payload

            version1 = "9.9.101"
            version2 = "9.9.102"
            version3 = "9.9.103"

            publish_v1 = publish_version(version1, include_obsolete=True)
            latest_v1 = fetch_remote_latest(smoke_config_path)
            _assert(latest_v1 is not None and latest_v1.version == version1, "v1 发布后 latest 未指向 9.9.101")

            all_update_v1 = _run_headless_update(
                workspace_root=workspace,
                target_root=target_root,
                launcher_dir=launcher_dir,
                launcher_exe=launcher_exe,
                server_base=smoke_backend_base_url,
                channel=channel,
                scope=PACKAGE_SCOPE_ALL,
            )

            _assert((launcher_dir / launcher_live_rel).read_text(encoding="utf-8").strip() == "launcher-9.9.101", "v1 launcher 文件内容不正确")
            _assert((target_root / game_live_rel).read_text(encoding="utf-8").strip() == "game-9.9.101", "v1 game 文件内容不正确")
            _assert((launcher_dir / launcher_obsolete_rel).exists(), "v1 launcher 旧文件未安装")
            _assert((target_root / game_obsolete_rel).exists(), "v1 game 旧文件未安装")

            publish_v2 = publish_version(version2, include_obsolete=False)
            latest_v2 = fetch_remote_latest(smoke_config_path)
            _assert(latest_v2 is not None and latest_v2.version == version2, "v2 发布后 latest 未指向 9.9.102")
            history_v2 = fetch_release_history(smoke_config_path, limit=10)
            _assert(history_v2.get("currentReleaseId") == publish_v2["releaseId"], "v2 history 未返回当前 latest releaseId")
            _assert(len(history_v2.get("history", [])) >= 2, "v2 history 数量不足")

            launcher_manifest_v2 = _fetch_json(f"{smoke_backend_base_url}/updates/{channel}/releases/{publish_v2['releaseId']}/launcher/release-manifest.json")
            game_manifest_v2 = _fetch_json(f"{smoke_backend_base_url}/updates/{channel}/releases/{publish_v2['releaseId']}/game/release-manifest.json")
            _assert((launcher_manifest_v2.get("deleteList") or []) == [], "v2 launcher deleteList 应保持为空")
            _assert((game_manifest_v2.get("deleteList") or []) == [], "v2 game deleteList 应保持为空")

            launcher_args_file.unlink(missing_ok=True)
            all_update_v2 = _run_headless_update(
                workspace_root=workspace,
                target_root=target_root,
                launcher_dir=launcher_dir,
                launcher_exe=launcher_exe,
                server_base=smoke_backend_base_url,
                channel=channel,
                scope=PACKAGE_SCOPE_ALL,
            )
            restart_marker = _wait_for_restart_marker(launcher_args_file)

            _assert((launcher_dir / launcher_live_rel).read_text(encoding="utf-8").strip() == "launcher-9.9.102", "v2 launcher 文件内容未更新")
            _assert((target_root / game_live_rel).read_text(encoding="utf-8").strip() == "game-9.9.102", "v2 game 文件内容未更新")
            _assert((launcher_dir / launcher_obsolete_rel).exists(), "v2 launcher 未勾选旧文件不应被自动删除")
            _assert((target_root / game_obsolete_rel).exists(), "v2 game 未勾选旧文件不应被自动删除")

            release_state = load_json(release_state_path, default={}) or {}
            _assert(str(((release_state.get("launcher") or {}).get("version")) or "") == version2, "release-state launcher.version 未更新到 v2")
            _assert(str(((release_state.get("game") or {}).get("version")) or "") == version2, "release-state game.version 未更新到 v2")
            _assert(str(release_state.get("version") or "") == version2, "release-state 兼容 version 未更新到 v2")
            _assert(str(release_state.get("pendingVersion") or "") == "", "release-state pendingVersion 应为空")
            _assert(all_update_v1.get("summary", {}).get("executedScopes") == [PACKAGE_SCOPE_LAUNCHER, PACKAGE_SCOPE_GAME], "v1 all scope 未按 launcher->game 执行")
            _assert(all_update_v2.get("summary", {}).get("executedScopes") == [PACKAGE_SCOPE_LAUNCHER, PACKAGE_SCOPE_GAME], "v2 all scope 未按 launcher->game 执行")

            publish_v3 = publish_version(version3, include_obsolete=False)
            latest_v3 = fetch_remote_latest(smoke_config_path)
            _assert(latest_v3 is not None and latest_v3.version == version3, "v3 发布后 latest 未指向 9.9.103")
            history_v3 = fetch_release_history(smoke_config_path, limit=10)
            _assert(history_v3.get("currentReleaseId") == publish_v3["releaseId"], "v3 currentReleaseId 不正确")
            _assert(len(history_v3.get("history", [])) >= 3, "v3 history 数量不足")

            delete_v1 = delete_release_http(smoke_config_path, publish_v1["releaseId"])
            _assert(delete_v1.get("deletedReleaseId") == publish_v1["releaseId"], "删除 v1 返回值不正确")
            history_after_delete_v1 = fetch_release_history(smoke_config_path, limit=10)
            release_ids_after_delete_v1 = [item.get("releaseId") for item in history_after_delete_v1.get("history", [])]
            _assert(publish_v1["releaseId"] not in release_ids_after_delete_v1, "删除 v1 后历史里仍存在 v1")
            _assert(history_after_delete_v1.get("currentReleaseId") == publish_v3["releaseId"], "删除非 latest 后 currentReleaseId 被错误改变")

            delete_v3 = delete_release_http(smoke_config_path, publish_v3["releaseId"])
            _assert(delete_v3.get("deletedWasCurrent") is True, "删除 v3 时 deletedWasCurrent 应为 true")
            latest_after_delete_v3 = fetch_remote_latest(smoke_config_path)
            _assert(latest_after_delete_v3 is not None and latest_after_delete_v3.version == version2, "删除 latest v3 后未回退到 v2")
            history_after_delete_v3 = fetch_release_history(smoke_config_path, limit=10)
            _assert(history_after_delete_v3.get("currentReleaseId") == publish_v2["releaseId"], "删除 latest v3 后 currentReleaseId 未切回 v2")

            delete_v2 = delete_release_http(smoke_config_path, publish_v2["releaseId"])
            _assert(delete_v2.get("channelHasReleases") is False, "删除最后版本后 channelHasReleases 应为 false")
            history_after_delete_v2 = fetch_release_history(smoke_config_path, limit=10)
            _assert(history_after_delete_v2.get("history") == [], "删除最后版本后 history 应为空")
            _assert(history_after_delete_v2.get("currentReleaseId") == "", "删除最后版本后 currentReleaseId 应为空")
            latest_url = f"{smoke_backend_base_url}/api/update/v1/channels/{channel}/latest"
            latest_deleted_response = requests.get(latest_url, timeout=20)
            _assert(latest_deleted_response.status_code == 404, "删除最后版本后 latest 应返回 404")

            bundle_channel = f"{channel}-bundle"
            bundle_username = "ee2x"
            bundle_password = "ee2x"
            bundle_backend_process, bundle_backend_base_url = _start_local_backend(
                workspace_root=workspace,
                channel=bundle_channel,
                admin_username=bundle_username,
                admin_password=bundle_password,
            )
            try:
                bundle_config_path = _make_publish_config(
                    workspace / "publish-bundle-local.json",
                    backend_base_url=bundle_backend_base_url,
                    admin_username=bundle_username,
                    admin_password=bundle_password,
                    channel=bundle_channel,
                )

                bundle_version1 = "8.8.201"
                bundle_version2 = "8.8.202"

                write_source_payload(bundle_version1, include_obsolete=True)
                bundle_v1_path = export_bundle(bundle_version1, f"Bundle publish {bundle_version1}")
                bundle_publish_v1 = publish_bundle_http(bundle_v1_path, bundle_config_path)
                _assert(bundle_publish_v1.get("ok") is True, f"bundle 发布 {bundle_version1} 失败: {bundle_publish_v1}")
                bundle_latest_v1 = fetch_remote_latest(bundle_config_path)
                _assert(bundle_latest_v1 is not None and bundle_latest_v1.version == bundle_version1, "bundle v1 发布后 latest 未指向 8.8.201")

                write_source_payload(bundle_version2, include_obsolete=False)
                bundle_v2_path = export_bundle(bundle_version2, f"Bundle publish {bundle_version2}")
                bundle_publish_v2 = publish_bundle_http(bundle_v2_path, bundle_config_path)
                _assert(bundle_publish_v2.get("ok") is True, f"bundle 发布 {bundle_version2} 失败: {bundle_publish_v2}")
                bundle_latest_v2 = fetch_remote_latest(bundle_config_path)
                _assert(bundle_latest_v2 is not None and bundle_latest_v2.version == bundle_version2, "bundle v2 发布后 latest 未指向 8.8.202")
                bundle_history_v2 = fetch_release_history(bundle_config_path, limit=10)
                _assert(bundle_history_v2.get("currentReleaseId") == bundle_publish_v2["releaseId"], "bundle v2 currentReleaseId 不正确")
                _assert(len(bundle_history_v2.get("history", [])) >= 2, "bundle v2 history 数量不足")

                bundle_delete_v2 = delete_release_http(bundle_config_path, bundle_publish_v2["releaseId"])
                _assert(bundle_delete_v2.get("deletedWasCurrent") is True, "bundle 删除 latest v2 时 deletedWasCurrent 应为 true")
                bundle_latest_after_delete_v2 = fetch_remote_latest(bundle_config_path)
                _assert(bundle_latest_after_delete_v2 is not None and bundle_latest_after_delete_v2.version == bundle_version1, "bundle 删除 latest v2 后未回退到 v1")

                bundle_delete_v1 = delete_release_http(bundle_config_path, bundle_publish_v1["releaseId"])
                _assert(bundle_delete_v1.get("channelHasReleases") is False, "bundle 删除最后版本后 channelHasReleases 应为 false")
                bundle_history_after_delete_v1 = fetch_release_history(bundle_config_path, limit=10)
                _assert(bundle_history_after_delete_v1.get("history") == [], "bundle 删除最后版本后 history 应为空")
            finally:
                bundle_backend_logs = _stop_process(bundle_backend_process)

            print(
                json.dumps(
                    {
                        "ok": True,
                        "channel": channel,
                        "backendBaseUrl": smoke_backend_base_url,
                        "publish": {
                            "v1": publish_v1,
                            "v2": publish_v2,
                            "v3": publish_v3,
                        },
                        "updates": {
                            "allV1": all_update_v1,
                            "allV2": all_update_v2,
                        },
                        "deleteResults": {
                            "deleteV1": delete_v1,
                            "deleteV3": delete_v3,
                            "deleteV2": delete_v2,
                        },
                        "bundlePublish": {
                            "backendBaseUrl": bundle_backend_base_url,
                            "channel": bundle_channel,
                            "v1": bundle_publish_v1,
                            "v2": bundle_publish_v2,
                            "deleteV2": bundle_delete_v2,
                            "deleteV1": bundle_delete_v1,
                            "historyAfterDeleteV1": bundle_history_after_delete_v1,
                            "backendLogs": bundle_backend_logs,
                        },
                        "restartMarker": restart_marker,
                        "releaseState": release_state,
                        "historyAfterDeleteV2": history_after_delete_v2,
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
        finally:
            _stop_process(smoke_backend_process)
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


if __name__ == "__main__":
    main()
