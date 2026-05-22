from __future__ import annotations

import shutil
import subprocess
import time
import tempfile
import urllib.request
import zipfile
import json
import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from ee2x_update_suite.shared.constants import (
    APPLY_HISTORY_NAME,
    LAUNCHER_DIR_NAME,
    LAST_UPDATER_LOG_NAME,
    PACKAGE_SCOPE_ALL,
    PACKAGE_SCOPE_GAME,
    PACKAGE_SCOPE_LAUNCHER,
    RELEASE_STATE_NAME,
    ROOT_DIR_NAME,
    TEMP_SUFFIX,
)
from ee2x_update_suite.shared.hash_utils import sha256_file
from ee2x_update_suite.shared.json_utils import load_json, save_json
from ee2x_update_suite.shared.models import ApplySummary, LatestRelease, ManifestFileEntry, ReleaseManifest, ReleasePackage
from ee2x_update_suite.shared.path_utils import normalize_relpath, path_is_within_prefixes, safe_join


ProgressCallback = Callable[[str, str, float], None]

PATCHER_PROTECTED_PREFIXES = {
    PACKAGE_SCOPE_LAUNCHER: [
        "Config",
        "Logs",
        "data/userdata",
        "data/game-csv",
        "data/Settlement-img",
        "update/runtime",
    ],
    PACKAGE_SCOPE_GAME: [],
}
UP_RUNTIME_FROZEN_PREFIXES = {
    PACKAGE_SCOPE_GAME: [
        "EE2.exe",
        "EE2X.exe",
        "UP15.dll",
        "UP15_GameHelper.dll",
        "UnofficialVersionConfig.txt",
        "Unofficial Patch Files",
    ],
    PACKAGE_SCOPE_LAUNCHER: [],
}


class PatcherError(RuntimeError):
    """可信新更新器错误。"""


def _append_log(log_file: Path | None, line: str) -> None:
    if log_file is None:
        return
    try:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        with log_file.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(line + "\n")
    except Exception:
        pass


def _emit(progress: ProgressCallback | None, log_file: Path | None, stage: str, detail: str, percent: float) -> None:
    if progress is not None:
        progress(stage, detail, percent)
    _append_log(log_file, f"[{stage}] {detail}")


def _latest_url(server_base: str, channel: str) -> str:
    return f"{server_base.rstrip('/')}/updates/{channel}/latest.json"


def _fetch_json(url: str, timeout: int = 15) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "EE2X-Patcher/3.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        payload = response.read()
    import json

    return json.loads(payload.decode("utf-8"))


def _latest_release_from_dict(payload: dict) -> LatestRelease:
    packages: dict[str, ReleasePackage] = {}
    for scope, package_payload in (payload.get("packages", {}) or {}).items():
        packages[str(scope)] = ReleasePackage(
            manifestUrl=str(package_payload.get("manifestUrl", "")),
            packageUrl=str(package_payload.get("packageUrl", "")),
            packageSha256=str(package_payload.get("packageSha256", "")),
            packageSize=int(package_payload.get("packageSize", 0) or 0),
        )
    return LatestRelease(
        schemaVersion=int(payload.get("schemaVersion", 1) or 1),
        channel=str(payload.get("channel", "stable")),
        version=str(payload.get("version", "")),
        releaseNotes=str(payload.get("releaseNotes", "")),
        publishedAt=str(payload.get("publishedAt", "")),
        manifestUrl=str(payload.get("manifestUrl", "")),
        packageUrl=str(payload.get("packageUrl", "")),
        packageSha256=str(payload.get("packageSha256", "")),
        packageSize=int(payload.get("packageSize", 0) or 0),
        required=bool(payload.get("required", True)),
        packages=packages,
    )


def _manifest_from_dict(payload: dict) -> ReleaseManifest:
    files = [ManifestFileEntry(**item) for item in payload.get("files", [])]
    return ReleaseManifest(
        schemaVersion=payload["schemaVersion"],
        version=payload["version"],
        rootDirName=payload["rootDirName"],
        packageFileName=payload["packageFileName"],
        packageSha256=payload["packageSha256"],
        applyMode=payload["applyMode"],
        protectedPaths=list(payload.get("protectedPaths", [])),
        deleteList=list(payload.get("deleteList", [])),
        files=files,
    )


def _resolve_package(latest: LatestRelease, scope: str) -> ReleasePackage | None:
    if latest.packages:
        package = latest.packages.get(scope)
        if package:
            return package
        if scope == PACKAGE_SCOPE_GAME and latest.packageUrl and latest.manifestUrl:
            return ReleasePackage(
                manifestUrl=latest.manifestUrl,
                packageUrl=latest.packageUrl,
                packageSha256=latest.packageSha256,
                packageSize=latest.packageSize,
            )
        return None
    if scope == PACKAGE_SCOPE_GAME and latest.packageUrl and latest.manifestUrl:
        return ReleasePackage(
            manifestUrl=latest.manifestUrl,
            packageUrl=latest.packageUrl,
            packageSha256=latest.packageSha256,
            packageSize=latest.packageSize,
        )
    return None


def _download_file(url: str, target: Path, progress: ProgressCallback | None = None, log_file: Path | None = None) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "EE2X-Patcher/3.0"})
    with urllib.request.urlopen(req, timeout=30) as response, target.open("wb") as handle:
        total = int(response.headers.get("Content-Length", "0") or 0)
        downloaded = 0
        while True:
            chunk = response.read(1024 * 128)
            if not chunk:
                break
            handle.write(chunk)
            downloaded += len(chunk)
            if progress and total > 0:
                progress("下载", f"{downloaded} / {total} bytes", downloaded * 100 / total)
    _append_log(log_file, f"[下载] 已保存到 {target}")


def _extract_zip(zip_path: Path, extract_dir: Path) -> None:
    if extract_dir.exists():
        shutil.rmtree(extract_dir)
    extract_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as archive:
        archive.extractall(extract_dir)


def _validate_tree(extract_dir: Path, manifest: ReleaseManifest, expected_root_dir_name: str) -> Path:
    top_level_entries = [item.name for item in extract_dir.iterdir()]
    if top_level_entries != [manifest.rootDirName]:
        raise PatcherError(f"更新包顶层目录非法: {top_level_entries}，必须只有 {manifest.rootDirName}")
    root_dir = extract_dir / manifest.rootDirName
    if manifest.rootDirName != expected_root_dir_name:
        raise PatcherError(f"manifest.rootDirName 非法: {manifest.rootDirName}，期望 {expected_root_dir_name}")
    for file_entry in manifest.files:
        rel_path = normalize_relpath(file_entry.path)
        if not rel_path:
            raise PatcherError("manifest 中存在空路径。")
        source = safe_join(root_dir, rel_path)
        if not source.is_file():
            raise PatcherError(f"更新包缺少文件: {rel_path}")
        if source.stat().st_size != file_entry.size:
            raise PatcherError(f"文件大小不匹配: {rel_path}")
        if sha256_file(source) != file_entry.sha256:
            raise PatcherError(f"文件哈希不匹配: {rel_path}")
    return root_dir


def _remove_any(path: Path) -> None:
    if not path.exists():
        return
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()


def _copy_any(src: Path, dest: Path) -> None:
    if src.is_dir():
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(src, dest)
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)


def _query_launcher_processes_by_path(launcher_exe: Path) -> list[dict] | None:
    if subprocess.os.name != "nt":
        return []
    try:
        target = str(launcher_exe.resolve()).replace("'", "''")
        script = (
            f"$target = [System.IO.Path]::GetFullPath('{target}'); "
            "$items = Get-CimInstance Win32_Process | Where-Object { "
            "$_.ExecutablePath -and "
            "[string]::Equals([System.IO.Path]::GetFullPath($_.ExecutablePath), $target, [System.StringComparison]::OrdinalIgnoreCase) "
            "} | Select-Object ProcessId, Name, ExecutablePath; "
            "if ($items) { $items | ConvertTo-Json -Compress }"
        )
        encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-EncodedCommand", encoded],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            timeout=8,
        )
        if completed.returncode != 0:
            return None
        output = (completed.stdout or "").strip()
        if not output:
            return []
        payload = json.loads(output)
        if isinstance(payload, dict):
            payload = [payload]
        processes = []
        for item in payload:
            pid = int(item.get("ProcessId", 0) or 0)
            if pid <= 0:
                continue
            processes.append(
                {
                    "pid": pid,
                    "name": str(item.get("Name", "") or ""),
                    "path": str(item.get("ExecutablePath", "") or ""),
                }
            )
        return processes
    except Exception:
        return None


def _launcher_processes_alive_by_name(executable_name: str) -> bool:
    if not executable_name or subprocess.os.name != "nt":
        return False
    try:
        completed = subprocess.run(
            ["tasklist", "/FI", f"IMAGENAME eq {executable_name}", "/FO", "CSV", "/NH"],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            timeout=5,
        )
        output = (completed.stdout or "").strip()
        if not output:
            return False
        if "No tasks are running" in output or "没有运行的任务" in output:
            return False
        return executable_name.lower() in output.lower()
    except Exception:
        return False


def _terminate_launcher_processes_by_pid(processes: list[dict], *, force: bool, log_file: Path | None) -> None:
    if subprocess.os.name != "nt":
        return
    mode = "强制" if force else "温和"
    for proc in processes:
        pid = int(proc.get("pid", 0) or 0)
        if pid <= 0:
            continue
        args = ["taskkill", "/PID", str(pid), "/T"]
        if force:
            args.insert(1, "/F")
        try:
            completed = subprocess.run(
                args,
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=5,
            )
            _append_log(log_file, f"[LauncherKill] {mode}结束 PID={pid} path={proc.get('path', '')} exit={completed.returncode}")
        except Exception as exc:
            _append_log(log_file, f"[LauncherKill] {mode}结束 PID={pid} 失败: {exc}")


def _kill_launcher_by_name(executable_name: str, log_file: Path | None) -> None:
    if not executable_name or subprocess.os.name != "nt":
        return
    for args in (["taskkill", "/IM", executable_name], ["taskkill", "/F", "/IM", executable_name]):
        try:
            completed = subprocess.run(args, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
            _append_log(log_file, f"[LauncherKill] 按镜像名结束 {executable_name}: {' '.join(args[1:])} exit={completed.returncode}")
        except Exception as exc:
            _append_log(log_file, f"[LauncherKill] 按镜像名结束 {executable_name} 失败: {exc}")


def _wait_for_launcher_exit(launcher_exe: Path, log_file: Path | None, timeout_seconds: float = 8.0) -> bool:
    executable_name = launcher_exe.name
    if not executable_name or subprocess.os.name != "nt":
        return True
    deadline = time.monotonic() + max(timeout_seconds, 0.5)
    while time.monotonic() < deadline:
        processes = _query_launcher_processes_by_path(launcher_exe)
        if processes == []:
            if not _launcher_processes_alive_by_name(executable_name):
                return True
            _append_log(log_file, f"[LauncherKill] 路径查询为空，但同名进程仍存在: {executable_name}")
        if processes is None:
            _append_log(log_file, f"[LauncherKill] 无法按路径查询旧进程，降级为镜像名检测: {executable_name}")
            if not _launcher_processes_alive_by_name(executable_name):
                return True
        else:
            pids = ",".join(str(proc["pid"]) for proc in processes)
            _append_log(log_file, f"[LauncherKill] 旧进程仍在运行，等待退出: pids={pids}")
        time.sleep(0.2)
    processes = _query_launcher_processes_by_path(launcher_exe)
    if processes is None:
        alive = _launcher_processes_alive_by_name(executable_name)
        if alive:
            _append_log(log_file, f"[LauncherKill] 超时后仍检测到同名进程: {executable_name}")
        return not alive
    if processes:
        pids = ",".join(str(proc["pid"]) for proc in processes)
        _append_log(log_file, f"[LauncherKill] 超时后仍有残留旧进程: pids={pids}")
        return False
    if _launcher_processes_alive_by_name(executable_name):
        _append_log(log_file, f"[LauncherKill] 路径查询为空，但超时后同名进程仍存在: {executable_name}")
        return False
    return True


def _kill_launcher(launcher_exe: Path, log_file: Path | None) -> bool:
    executable_name = launcher_exe.name
    if not executable_name or subprocess.os.name != "nt":
        return True
    _append_log(log_file, f"[LauncherKill] 目标启动器路径: {launcher_exe}")
    processes = _query_launcher_processes_by_path(launcher_exe)
    if processes is None:
        _append_log(log_file, f"[LauncherKill] 无法按路径枚举旧进程，降级为镜像名清理: {executable_name}")
        _kill_launcher_by_name(executable_name, log_file)
        return _wait_for_launcher_exit(launcher_exe, log_file, timeout_seconds=8.0)
    if not processes:
        if _launcher_processes_alive_by_name(executable_name):
            _append_log(log_file, f"[LauncherKill] 未发现同路径旧进程，但检测到同名进程，降级为镜像名清理: {executable_name}")
            _kill_launcher_by_name(executable_name, log_file)
            return _wait_for_launcher_exit(launcher_exe, log_file, timeout_seconds=8.0)
        _append_log(log_file, "[LauncherKill] 未发现同路径旧启动器进程")
        return True
    pids = ",".join(str(proc["pid"]) for proc in processes)
    _append_log(log_file, f"[LauncherKill] 命中旧启动器进程: pids={pids}")
    _terminate_launcher_processes_by_pid(processes, force=False, log_file=log_file)
    if _wait_for_launcher_exit(launcher_exe, log_file, timeout_seconds=1.5):
        return True
    processes = _query_launcher_processes_by_path(launcher_exe)
    if processes:
        pids = ",".join(str(proc["pid"]) for proc in processes)
        _append_log(log_file, f"[LauncherKill] 温和结束后仍有残留，执行强制结束: pids={pids}")
        _terminate_launcher_processes_by_pid(processes, force=True, log_file=log_file)
    return _wait_for_launcher_exit(launcher_exe, log_file, timeout_seconds=8.0)


def _restart_launcher(launcher_exe: Path, log_file: Path | None) -> tuple[bool, str]:
    if not launcher_exe.exists():
        return False, f"未找到启动器: {launcher_exe}"
    try:
        runtime_dir = log_file.parent if log_file is not None else launcher_exe.parent
        runtime_dir.mkdir(parents=True, exist_ok=True)
        helper_dir = Path(tempfile.gettempdir()) / "ee2x-launcher-restart"
        helper_dir.mkdir(parents=True, exist_ok=True)
        helper_script = helper_dir / "launcher-restart-helper.ps1"
        helper_log = helper_dir / "launcher-restart-helper.log"
        target = str(launcher_exe.resolve()).replace("'", "''")
        target_dir = str(launcher_exe.parent.resolve()).replace("'", "''")
        helper_log_path = str(helper_log.resolve()).replace("'", "''")
        target_name = launcher_exe.name.replace("'", "''")
        helper_script.write_text(
            "\n".join(
                [
                    "$ErrorActionPreference = 'Continue'",
                    f"$target = '{target}'",
                    f"$targetDir = '{target_dir}'",
                    f"$targetName = '{target_name}'",
                    f"$logPath = '{helper_log_path}'",
                    "function Write-HelperLog([string]$message) {",
                    "  $line = '[{0}] {1}' -f ([DateTime]::Now.ToString('o')), $message",
                    "  Add-Content -Path $logPath -Value $line -Encoding UTF8",
                    "}",
                    "function Get-LauncherProcesses() {",
                    "  @(Get-CimInstance Win32_Process | Where-Object {",
                    "    $_.ExecutablePath -and [string]::Equals([System.IO.Path]::GetFullPath($_.ExecutablePath), $target, [System.StringComparison]::OrdinalIgnoreCase)",
                    "  })",
                    "}",
                    "function Has-LauncherByName() {",
                    "  @(Get-Process -Name ([System.IO.Path]::GetFileNameWithoutExtension($targetName)) -ErrorAction SilentlyContinue).Count -gt 0",
                    "}",
                    "Write-HelperLog \"helper start target=$target\"",
                    "$deadline = (Get-Date).AddSeconds(12)",
                    "while ((Get-Date) -lt $deadline) {",
                    "  $items = Get-LauncherProcesses",
                    "  if ($items.Count -eq 0) {",
                    "    if (-not (Has-LauncherByName)) { break }",
                    "    Write-HelperLog ('path query empty but same-name launcher still alive: ' + $targetName)",
                    "  } else {",
                    "    Write-HelperLog ('waiting old launcher exit pids=' + (($items | Select-Object -ExpandProperty ProcessId) -join ','))",
                    "  }",
                    "  Start-Sleep -Milliseconds 300",
                    "}",
                    "$items = Get-LauncherProcesses",
                    "if ($items.Count -gt 0 -or (Has-LauncherByName)) {",
                    "  if ($items.Count -gt 0) {",
                    "    Write-HelperLog ('force kill lingering pids=' + (($items | Select-Object -ExpandProperty ProcessId) -join ','))",
                    "  } else {",
                    "    Write-HelperLog ('force kill by image name fallback: ' + $targetName)",
                    "  }",
                    "  foreach ($item in $items) {",
                    "    try {",
                    "      Start-Process -FilePath \"$env:SystemRoot\\System32\\taskkill.exe\" -ArgumentList '/F','/PID',$item.ProcessId,'/T' -NoNewWindow -Wait",
                    "    } catch {",
                    "      Write-HelperLog ('force kill failed pid=' + $item.ProcessId + ' error=' + $_.Exception.Message)",
                    "    }",
                    "  }",
                    "  try { Start-Process -FilePath \"$env:SystemRoot\\System32\\taskkill.exe\" -ArgumentList '/F','/IM',$targetName,'/T' -NoNewWindow -Wait } catch {}",
                    "  Start-Sleep -Milliseconds 600",
                    "}",
                    "$items = Get-LauncherProcesses",
                    "if ($items.Count -gt 0 -or (Has-LauncherByName)) {",
                    "  if ($items.Count -gt 0) {",
                    "    Write-HelperLog ('restart aborted, lingering remain pids=' + (($items | Select-Object -ExpandProperty ProcessId) -join ','))",
                    "  } else {",
                    "    Write-HelperLog ('restart aborted, lingering same-name process remain: ' + $targetName)",
                    "  }",
                    "  exit 9",
                    "}",
                    "Start-Sleep -Milliseconds 900",
                    "Write-HelperLog 'launching fresh launcher instance'",
                    "Start-Process -FilePath $target -ArgumentList '--updated' -WorkingDirectory $targetDir",
                ]
            ),
            encoding="utf-8-sig",
            newline="\n",
        )
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", str(helper_script)],
            cwd=str(helper_dir),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=25,
        )
        if completed.returncode != 0:
            _append_log(log_file, f"[LauncherKill] 重启助手执行失败: exit={completed.returncode}, log={helper_log}")
            return False, f"启动器重启助手执行失败: {helper_log}"
        _append_log(log_file, f"[LauncherKill] 重启助手执行完成: {helper_script} (log={helper_log})")
        return True, "启动器已通过重启助手全新拉起"
    except Exception as exc:
        return False, f"启动器重启失败: {exc}"


def _load_state(path: Path) -> dict:
    return load_json(path, default={}) or {}


def _scope_state(current_state: dict, scope: str) -> dict:
    package_state = current_state.get(scope, {})
    if isinstance(package_state, dict) and package_state:
        return package_state
    if scope == PACKAGE_SCOPE_GAME and current_state.get("version"):
        return {
            "version": current_state.get("version", ""),
            "packageSha256": current_state.get("packageSha256", ""),
        }
    return {}


def _save_scope_state(
    state_path: Path,
    current_state: dict,
    latest: LatestRelease,
    package: ReleasePackage,
    scope: str,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    state = dict(current_state)
    launcher_state = dict(state.get(PACKAGE_SCOPE_LAUNCHER, {}) or {})
    game_state = dict(state.get(PACKAGE_SCOPE_GAME, {}) or {})
    package_state = {
        "version": latest.version,
        "packageSha256": package.packageSha256,
        "manifestUrl": package.manifestUrl,
        "packageUrl": package.packageUrl,
        "publishedAt": latest.publishedAt,
        "appliedAt": now,
    }
    if scope == PACKAGE_SCOPE_LAUNCHER:
        launcher_state.update(package_state)
    else:
        game_state.update(package_state)
    state[PACKAGE_SCOPE_LAUNCHER] = launcher_state
    state[PACKAGE_SCOPE_GAME] = game_state
    state["required"] = latest.required
    state["releaseNotes"] = latest.releaseNotes
    state["pendingVersion"] = "" if game_state.get("version") == latest.version else latest.version
    state["appliedAt"] = now
    state["version"] = game_state.get("version", state.get("version", ""))
    state["packageSha256"] = game_state.get("packageSha256", state.get("packageSha256", ""))
    state.setdefault("lastShownChangelogVersion", "")
    save_json(state_path, state)


def _append_history(history_path: Path, payload: dict) -> None:
    history = load_json(history_path, default=[])
    if not isinstance(history, list):
        history = []
    history.append(payload)
    save_json(history_path, history)


def _scope_needs_update(current_state: dict, latest: LatestRelease, scope: str) -> tuple[str, ReleasePackage | None]:
    package = _resolve_package(latest, scope)
    if package is None:
        return "missing", None
    scope_state = _scope_state(current_state, scope)
    if scope_state.get("version") == latest.version and scope_state.get("packageSha256") == package.packageSha256:
        return "up_to_date", package
    return "update", package


def _protected_prefixes(scope: str) -> list[str]:
    return list(PATCHER_PROTECTED_PREFIXES.get(scope, []))


def _merge_summary(target: ApplySummary, source: ApplySummary) -> None:
    target.updatedFiles += source.updatedFiles
    target.skippedProtectedFiles += source.skippedProtectedFiles
    if source.skippedProtectedPaths:
        target.skippedProtectedPaths.extend(source.skippedProtectedPaths)
    target.deletedFiles += source.deletedFiles
    target.backedUpFiles += source.backedUpFiles
    target.rolledBack = target.rolledBack or source.rolledBack
    if source.notes:
        target.notes.extend(source.notes)


def _is_frozen_path(scope: str, rel_path: str) -> bool:
    return path_is_within_prefixes(normalize_relpath(rel_path), UP_RUNTIME_FROZEN_PREFIXES.get(scope, []))


def _apply_scope(
    *,
    game_root: Path,
    launcher_dir: Path,
    state_path: Path,
    history_path: Path,
    latest: LatestRelease,
    package: ReleasePackage,
    scope: str,
    launcher_exe: Path,
    progress: ProgressCallback | None,
    log_file: Path | None,
) -> ApplySummary:
    summary = ApplySummary(version=latest.version, scope=scope)
    current_state = _load_state(state_path)
    target_root = launcher_dir if scope == PACKAGE_SCOPE_LAUNCHER else game_root
    expected_root_dir_name = LAUNCHER_DIR_NAME if scope == PACKAGE_SCOPE_LAUNCHER else ROOT_DIR_NAME
    protected_prefixes = _protected_prefixes(scope)

    runtime_dir = launcher_dir / "update" / "runtime"
    staging_dir = runtime_dir / "staging" / f"{scope}-{latest.version}"
    extract_dir = staging_dir / "extracted"
    backup_dir = runtime_dir / "backups" / f"{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{scope}"

    manifest_payload = _fetch_json(package.manifestUrl)
    manifest = _manifest_from_dict(manifest_payload)
    if manifest.packageSha256 != package.packageSha256:
        raise PatcherError("latest.json 与 release-manifest.json 的包哈希不一致。")
    package_path = staging_dir / manifest.packageFileName

    if not _kill_launcher(launcher_exe, log_file):
        raise PatcherError(f"启动器旧进程未在超时内退出: {launcher_exe}")
    _emit(progress, log_file, f"{scope}:下载", f"下载 {manifest.packageFileName}", 20.0)
    _download_file(package.packageUrl, package_path, progress=None, log_file=log_file)
    if sha256_file(package_path) != package.packageSha256:
        raise PatcherError("下载包 SHA-256 校验失败。")

    _emit(progress, log_file, f"{scope}:校验", "解压并校验更新包", 40.0)
    _extract_zip(package_path, extract_dir)
    extracted_root = _validate_tree(extract_dir, manifest, expected_root_dir_name)

    touched_records: list[dict] = []
    backup_dir.mkdir(parents=True, exist_ok=True)
    try:
        files_count = max(len(manifest.files), 1)
        for index, file_entry in enumerate(manifest.files, start=1):
            rel_path = normalize_relpath(file_entry.path)
            if path_is_within_prefixes(rel_path, protected_prefixes):
                summary.skippedProtectedFiles += 1
                summary.skippedProtectedPaths.append(rel_path)
                _append_log(log_file, f"[{scope}:保护跳过] {rel_path}")
                continue
            if _is_frozen_path(scope, rel_path):
                summary.skippedProtectedFiles += 1
                summary.skippedProtectedPaths.append(rel_path)
                _append_log(log_file, f"[{scope}:UP冻结跳过] {rel_path}")
                continue
            source_path = safe_join(extracted_root, rel_path)
            target_path = safe_join(target_root, rel_path)
            existed = target_path.exists()
            backup_path = safe_join(backup_dir, rel_path)
            if existed:
                _copy_any(target_path, backup_path)
                summary.backedUpFiles += 1
            target_path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = target_path.with_name(target_path.name + TEMP_SUFFIX)
            shutil.copy2(source_path, temp_path)
            temp_path.replace(target_path)
            touched_records.append({"path": rel_path, "existed": existed, "deleted": False})
            summary.updatedFiles += 1
            _emit(progress, log_file, f"{scope}:应用", f"覆盖 {rel_path}", 40.0 + (index / files_count) * 40.0)

        for rel_path in manifest.deleteList:
            normalized = normalize_relpath(rel_path)
            if path_is_within_prefixes(normalized, protected_prefixes):
                summary.skippedProtectedFiles += 1
                summary.skippedProtectedPaths.append(normalized)
                _append_log(log_file, f"[{scope}:保护跳过删除] {normalized}")
                continue
            if _is_frozen_path(scope, normalized):
                summary.skippedProtectedFiles += 1
                summary.skippedProtectedPaths.append(normalized)
                _append_log(log_file, f"[{scope}:UP冻结跳过删除] {normalized}")
                continue
            target_path = safe_join(target_root, normalized)
            if not target_path.exists():
                continue
            backup_path = safe_join(backup_dir, normalized)
            _copy_any(target_path, backup_path)
            summary.backedUpFiles += 1
            _remove_any(target_path)
            touched_records.append({"path": normalized, "existed": True, "deleted": True})
            summary.deletedFiles += 1
            _append_log(log_file, f"[{scope}:删除] {normalized}")
    except Exception as exc:
        for record in reversed(touched_records):
            target_path = safe_join(target_root, record["path"])
            backup_path = safe_join(backup_dir, record["path"])
            if record["existed"] and backup_path.exists():
                _remove_any(target_path)
                _copy_any(backup_path, target_path)
            elif not record["existed"]:
                _remove_any(target_path)
        summary.rolledBack = True
        summary.notes.append(f"{scope} 已自动回滚: {exc}")
        raise

    _save_scope_state(state_path, current_state, latest, package, scope)
    _append_history(history_path, summary.to_dict() | {"appliedAt": datetime.now(timezone.utc).isoformat()})
    return summary


def _failure_payload(scope: str, version: str, error: Exception, log_file: Path | None, summary: ApplySummary | None) -> dict:
    payload = {
        "ok": False,
        "scope": scope,
        "version": version,
        "restartedLauncher": False,
        "error": str(error),
        "errorType": type(error).__name__,
    }
    if log_file is not None:
        payload["logPath"] = str(log_file)
    if summary is not None:
        payload["summary"] = summary.to_dict()
    return payload


def _success_payload(summary: ApplySummary, log_file: Path | None) -> dict:
    payload = {
        "ok": True,
        "scope": summary.scope,
        "version": summary.version,
        "restartedLauncher": summary.restartedLauncher,
        "summary": summary.to_dict(),
    }
    if log_file is not None:
        payload["logPath"] = str(log_file)
    return payload


def run_patcher(
    *,
    game_root: Path,
    launcher_dir: Path,
    server_base: str,
    channel: str,
    launcher_exe: Path,
    scope: str,
    result_file: Path | None = None,
    log_file: Path | None = None,
    progress: ProgressCallback | None = None,
) -> ApplySummary:
    runtime_dir = launcher_dir / "update" / "runtime"
    runtime_dir.mkdir(parents=True, exist_ok=True)
    state_path = runtime_dir / RELEASE_STATE_NAME
    history_path = runtime_dir / APPLY_HISTORY_NAME
    active_summary: ApplySummary | None = None
    latest_version = ""
    if log_file is None:
        log_file = runtime_dir / LAST_UPDATER_LOG_NAME
    try:
        _append_log(log_file, f"[启动] root={game_root} launcherDir={launcher_dir} launcherExe={launcher_exe} scope={scope} server={server_base} channel={channel}")
        latest = _latest_release_from_dict(_fetch_json(_latest_url(server_base, channel)))
        latest_version = latest.version
        active_summary = ApplySummary(version=latest.version, scope=scope)

        requested_scopes = [scope]
        if scope == PACKAGE_SCOPE_ALL:
            requested_scopes = [PACKAGE_SCOPE_LAUNCHER, PACKAGE_SCOPE_GAME]

        current_state = _load_state(state_path)
        for current_scope in requested_scopes:
            action, package = _scope_needs_update(current_state, latest, current_scope)
            if action == "missing":
                active_summary.skippedScopes.append(current_scope)
                active_summary.notes.append(f"{current_scope} 包未在 latest.json 中宣告，跳过。")
                _append_log(log_file, f"[{current_scope}] missing in latest, skipped")
                continue
            if action == "up_to_date":
                active_summary.skippedScopes.append(current_scope)
                active_summary.notes.append(f"{current_scope} 包已是最新版本，跳过。")
                _append_log(log_file, f"[{current_scope}] already up to date")
                continue
            assert package is not None
            _append_log(log_file, f"[{current_scope}] apply start")
            manifest_preview = _manifest_from_dict(_fetch_json(package.manifestUrl))
            frozen_hits = [
                normalize_relpath(item.path)
                for item in manifest_preview.files
                if _is_frozen_path(current_scope, item.path)
            ] + [
                normalize_relpath(item)
                for item in manifest_preview.deleteList
                if _is_frozen_path(current_scope, item)
            ]
            if frozen_hits:
                _append_log(log_file, f"[{current_scope}] 命中 UP 冻结区: {', '.join(frozen_hits)}")
            scope_summary = _apply_scope(
                game_root=game_root,
                launcher_dir=launcher_dir,
                state_path=state_path,
                history_path=history_path,
                latest=latest,
                package=package,
                scope=current_scope,
                launcher_exe=launcher_exe,
                progress=progress,
                log_file=log_file,
            )
            active_summary.executedScopes.append(current_scope)
            active_summary.scopeSummaries[current_scope] = scope_summary.to_dict()
            _merge_summary(active_summary, scope_summary)
            current_state = _load_state(state_path)

        if not active_summary.executedScopes:
            active_summary.notes.append("无需更新，所有 scope 已是最新版本。")

        active_summary.restartedLauncher, active_summary.restartMessage = _restart_launcher(launcher_exe, log_file)
        if active_summary.restartMessage:
            active_summary.notes.append(active_summary.restartMessage)
        if not active_summary.restartedLauncher:
            _append_log(log_file, f"[错误] {active_summary.restartMessage or '启动器重启失败'}")
            raise PatcherError(active_summary.restartMessage or "启动器重启失败")
        _append_log(log_file, f"[完成] {active_summary.restartMessage}")
        if result_file is not None:
            save_json(result_file, _success_payload(active_summary, log_file))
        return active_summary
    except Exception as exc:
        _append_log(log_file, f"[错误] {exc}")
        if result_file is not None:
            save_json(result_file, _failure_payload(scope, latest_version, exc, log_file, active_summary))
        raise
