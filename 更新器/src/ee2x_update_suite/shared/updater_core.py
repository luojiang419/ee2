from __future__ import annotations

import shutil
import subprocess
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from .constants import (
    APPLY_HISTORY_NAME,
    LATEST_FILE_NAME,
    LAUNCHER_DIR_NAME,
    PACKAGE_SCOPE_GAME,
    PACKAGE_SCOPE_LAUNCHER,
    PROTECTED_RELATIVE_PATHS,
    RELEASE_STATE_NAME,
    ROOT_DIR_NAME,
    TEMP_SUFFIX,
)
from .hash_utils import sha256_file
from .json_utils import load_json, save_json
from .models import ApplySummary, LatestRelease, ManifestFileEntry, ReleaseManifest, ReleasePackage
from .path_utils import normalize_relpath, path_is_within_prefixes, safe_join


ProgressCallback = Callable[[str, str, float], None]


class UpdateError(RuntimeError):
    """更新失败。"""


def _latest_url(server_base: str, channel: str) -> str:
    return f"{server_base.rstrip('/')}/updates/{channel}/{LATEST_FILE_NAME}"


def _fetch_json(url: str, timeout: int = 15) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "EE2X-Updater/2.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return load_json_from_bytes(response.read())


def load_json_from_bytes(payload: bytes) -> dict:
    import json

    return json.loads(payload.decode("utf-8"))


def _download_file(url: str, target: Path, progress: ProgressCallback | None = None, stage: str = "下载") -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "EE2X-Updater/2.0"})
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
                progress(stage, f"{downloaded} / {total} bytes", downloaded * 100 / total)
    if progress:
        progress(stage, f"已保存到 {target}", 100.0)


def _release_manifest_from_dict(payload: dict) -> ReleaseManifest:
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


def _resolve_scope_package(latest: LatestRelease, scope: str) -> ReleasePackage:
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
        raise UpdateError(f"latest.json 中缺少 {scope} 包信息。")
    if scope == PACKAGE_SCOPE_GAME and latest.packageUrl and latest.manifestUrl:
        return ReleasePackage(
            manifestUrl=latest.manifestUrl,
            packageUrl=latest.packageUrl,
            packageSha256=latest.packageSha256,
            packageSize=latest.packageSize,
        )
    raise UpdateError("当前 latest.json 仍是旧格式，不支持 launcher 自升级。")


def _extract_zip(zip_path: Path, extract_dir: Path) -> None:
    if extract_dir.exists():
        shutil.rmtree(extract_dir)
    extract_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as archive:
        archive.extractall(extract_dir)


def _validate_extracted_tree(extract_dir: Path, manifest: ReleaseManifest, expected_root_dir_name: str) -> Path:
    top_level_entries = [item.name for item in extract_dir.iterdir()]
    if top_level_entries != [manifest.rootDirName]:
        raise UpdateError(f"更新包顶层目录非法: {top_level_entries}，必须只有 {manifest.rootDirName}")
    root_dir = extract_dir / manifest.rootDirName
    if manifest.rootDirName != expected_root_dir_name:
        raise UpdateError(f"manifest.rootDirName 非法: {manifest.rootDirName}，期望 {expected_root_dir_name}")
    for file_entry in manifest.files:
        if not normalize_relpath(file_entry.path):
            raise UpdateError("manifest 中存在空路径。")
        source = safe_join(root_dir, file_entry.path)
        if not source.is_file():
            raise UpdateError(f"更新包缺少文件: {file_entry.path}")
        if source.stat().st_size != file_entry.size:
            raise UpdateError(f"文件大小不匹配: {file_entry.path}")
        if sha256_file(source) != file_entry.sha256:
            raise UpdateError(f"文件哈希不匹配: {file_entry.path}")
    return root_dir


def _copy_any(src: Path, dest: Path) -> None:
    if src.is_dir():
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(src, dest)
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)


def _remove_any(path: Path) -> None:
    if not path.exists():
        return
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()


def _kill_launcher(executable_name: str) -> None:
    if not executable_name or subprocess.os.name != "nt":
        return
    for args in (["taskkill", "/IM", executable_name], ["taskkill", "/F", "/IM", executable_name]):
        try:
            subprocess.run(args, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
        except Exception:
            continue


def _restart_launcher(launcher_exe: Path) -> tuple[bool, str]:
    if not launcher_exe.exists():
        return False, f"未找到启动器: {launcher_exe}"
    try:
        subprocess.Popen([str(launcher_exe), "--updated"], cwd=str(launcher_exe.parent))
        return True, "启动器已重启"
    except Exception as exc:
        return False, f"启动器重启失败: {exc}"


def _protected_paths_for_scope(scope: str) -> list[str]:
    if scope != PACKAGE_SCOPE_LAUNCHER:
        return list(PROTECTED_RELATIVE_PATHS)
    prefix = f"{LAUNCHER_DIR_NAME}/"
    result: list[str] = []
    for item in PROTECTED_RELATIVE_PATHS:
        normalized = normalize_relpath(item)
        if normalized.startswith(prefix):
            stripped = normalize_relpath(normalized[len(prefix) :])
            if stripped:
                result.append(stripped)
    return result


def _load_release_state(path: Path) -> dict:
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


def run_update(
    *,
    game_root: Path,
    launcher_dir: Path,
    server_base: str,
    channel: str,
    launcher_exe: Path | None = None,
    progress: ProgressCallback | None = None,
    scope: str = PACKAGE_SCOPE_GAME,
) -> ApplySummary:
    runtime_dir = launcher_dir / "update" / "runtime"
    staging_root = runtime_dir / "staging"
    backups_root = runtime_dir / "backups"
    state_path = runtime_dir / RELEASE_STATE_NAME
    history_path = runtime_dir / APPLY_HISTORY_NAME
    runtime_dir.mkdir(parents=True, exist_ok=True)

    if progress:
        progress("检查版本", "读取 latest.json", 0.0)
    latest = _latest_release_from_dict(_fetch_json(_latest_url(server_base, channel)))
    package = _resolve_scope_package(latest, scope)
    summary = ApplySummary(version=latest.version, scope=scope)

    current_state = _load_release_state(state_path)
    current_scope_state = _scope_state(current_state, scope)
    if (
        current_scope_state.get("version") == latest.version
        and current_scope_state.get("packageSha256") == package.packageSha256
    ):
        summary.notes.append(f"{scope} 包已是同版本且包哈希一致，跳过更新。")
        if progress:
            progress("检查版本", "已是最新版本", 100.0)
        return summary

    if progress:
        progress("校验", "读取 release-manifest.json", 15.0)
    manifest = _release_manifest_from_dict(_fetch_json(package.manifestUrl))
    if manifest.packageSha256 != package.packageSha256:
        raise UpdateError("latest.json 与 release-manifest.json 的包哈希不一致。")

    target_root = launcher_dir if scope == PACKAGE_SCOPE_LAUNCHER else game_root
    expected_root_dir_name = LAUNCHER_DIR_NAME if scope == PACKAGE_SCOPE_LAUNCHER else ROOT_DIR_NAME
    protected_paths = _protected_paths_for_scope(scope)
    staging_dir = staging_root / f"{scope}-{latest.version}"
    package_path = staging_dir / manifest.packageFileName
    extract_dir = staging_dir / "extracted"
    backup_dir = backups_root / f"{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{scope}"

    executable_name = launcher_exe.name if launcher_exe else f"{LAUNCHER_DIR_NAME}.exe"
    _kill_launcher(executable_name)

    if progress:
        progress("下载", f"下载 {manifest.packageFileName}", 25.0)
    _download_file(package.packageUrl, package_path, progress=progress, stage="下载")
    if sha256_file(package_path) != package.packageSha256:
        raise UpdateError("下载包 SHA-256 校验失败。")

    if progress:
        progress("校验", "解压并验证更新包结构", 55.0)
    _extract_zip(package_path, extract_dir)
    extracted_root = _validate_extracted_tree(extract_dir, manifest, expected_root_dir_name)

    touched_records: list[dict] = []
    backup_dir.mkdir(parents=True, exist_ok=True)

    try:
        if progress:
            progress("备份", "开始备份并应用文件", 70.0)
        for index, file_entry in enumerate(manifest.files, start=1):
            rel_path = normalize_relpath(file_entry.path)
            if path_is_within_prefixes(rel_path, protected_paths):
                summary.skippedProtectedFiles += 1
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
            if progress:
                progress("应用", f"覆盖 {rel_path}", 70.0 + (index / max(len(manifest.files), 1)) * 25.0)

        for rel_path in manifest.deleteList:
            normalized = normalize_relpath(rel_path)
            if path_is_within_prefixes(normalized, protected_paths):
                summary.skippedProtectedFiles += 1
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
        summary.notes.append(f"已自动回滚: {exc}")
        raise

    _save_scope_state(state_path, current_state, latest, package, scope)
    _append_history(history_path, summary.to_dict() | {"appliedAt": datetime.now(timezone.utc).isoformat()})

    if launcher_exe is None:
        launcher_exe = launcher_dir / f"{LAUNCHER_DIR_NAME}.exe"
    summary.restartedLauncher, summary.restartMessage = _restart_launcher(launcher_exe)
    if summary.restartMessage:
        summary.notes.append(summary.restartMessage)
    if progress:
        progress("完成", "更新完成", 100.0)
    return summary
