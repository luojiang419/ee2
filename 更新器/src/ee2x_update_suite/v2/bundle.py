from __future__ import annotations

import json
import os
import shutil
import subprocess
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any

from ee2x_update_suite.shared.hash_utils import sha256_file
from ee2x_update_suite.shared.json_utils import save_json, save_text

BUNDLE_FORMAT = "ee2x-v2-release-bundle"
BUNDLE_VERSION = 1
LAUNCHER_DIR_NAME = "地球帝国二代远航版启动器"
GAME_ROOT_DIR_NAME = "Empire Earth II"
DEFAULT_RUNTIME_PATHS = (
    "EE2.exe",
    "EE2X.exe",
    "UP15.dll",
    "UP15_GameHelper.dll",
    "UnofficialVersionConfig.txt",
    "Unofficial Patch Files",
)
DEFAULT_LEGACY_PATHS = (
    "update/ee2x-patcher.exe",
    "update/ee2x-patcher-cli.exe",
    "update/runtime",
    "temp_update",
)


@dataclass(slots=True)
class ReleaseBundleBuildResult:
    release_dir: Path
    bundle_meta_path: Path
    runtime_manifest_path: Path
    content_manifest_path: Path
    launcher_feed_dir: Path
    notes_path: Path


def normalize_relpath(value: str) -> str:
    cleaned = str(value or "").replace("\\", "/").strip().strip("/")
    while "//" in cleaned:
        cleaned = cleaned.replace("//", "/")
    return cleaned


def _safe_join(root: Path, rel_path: str) -> Path:
    normalized = normalize_relpath(rel_path)
    target = (root / PurePosixPath(normalized)).resolve()
    if not str(target).startswith(str(root.resolve())):
        raise RuntimeError(f"非法路径: {rel_path}")
    return target


def _run_command(args: list[str], *, cwd: Path) -> None:
    completed = subprocess.run(
        args,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"命令执行失败: {' '.join(args)}\n{completed.stdout.strip()}"
        )


def _copy_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def _iter_all_files(root: Path) -> list[Path]:
    return [path for path in sorted(root.rglob("*")) if path.is_file()]


def _iter_runtime_relative_paths(game_root: Path) -> list[str]:
    results: list[str] = []
    for raw in DEFAULT_RUNTIME_PATHS:
        candidate = game_root / raw
        if candidate.is_file():
            results.append(normalize_relpath(raw))
        elif candidate.is_dir():
            for item in _iter_all_files(candidate):
                results.append(normalize_relpath(str(item.relative_to(game_root))))
    return sorted(set(results))


def _is_runtime_relpath(rel_path: str) -> bool:
    normalized = normalize_relpath(rel_path)
    for raw in DEFAULT_RUNTIME_PATHS:
        prefix = normalize_relpath(raw)
        if normalized == prefix or normalized.startswith(f"{prefix}/"):
            return True
    return False


def _iter_content_relative_paths(game_root: Path, launcher_dir: Path) -> list[str]:
    launcher_rel = normalize_relpath(str(launcher_dir.relative_to(game_root)))
    results: list[str] = []
    for item in _iter_all_files(game_root):
        rel_path = normalize_relpath(str(item.relative_to(game_root)))
        if rel_path == launcher_rel or rel_path.startswith(f"{launcher_rel}/"):
            continue
        if _is_runtime_relpath(rel_path):
            continue
        results.append(rel_path)
    return results


def _build_runtime_bundle(game_root: Path, runtime_dir: Path, version: str) -> Path:
    stage_root = runtime_dir / GAME_ROOT_DIR_NAME
    package_path = runtime_dir / f"EE2X-runtime-{version}.zip"
    manifest_path = runtime_dir / "runtime-manifest.json"
    files_payload: list[dict[str, Any]] = []

    for rel_path in _iter_runtime_relative_paths(game_root):
        source = _safe_join(game_root, rel_path)
        staged = _safe_join(stage_root, rel_path)
        _copy_file(source, staged)
        files_payload.append(
            {
                "path": rel_path,
                "size": source.stat().st_size,
                "sha256": sha256_file(source),
            }
        )

    with zipfile.ZipFile(package_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for item in _iter_all_files(stage_root):
            archive.write(item, arcname=str(item.relative_to(runtime_dir)))

    manifest_payload = {
        "schemaVersion": 1,
        "version": version,
        "packageFileName": package_path.name,
        "packageSha256": sha256_file(package_path),
        "packageSize": package_path.stat().st_size,
        "files": files_payload,
    }
    save_json(manifest_path, manifest_payload)
    return manifest_path


def _build_content_bundle(
    *,
    game_root: Path,
    launcher_dir: Path,
    content_dir: Path,
    version: str,
    previous_content_dir: Path | None,
    previous_release_id: str,
    butler_exe: str,
) -> Path:
    if not butler_exe:
        raise RuntimeError("未配置 butler.exe，无法构建 content 补丁。")

    input_dir = content_dir / "input" / version
    for rel_path in _iter_content_relative_paths(game_root, launcher_dir):
        source = _safe_join(game_root, rel_path)
        staged = _safe_join(input_dir, rel_path)
        _copy_file(source, staged)

    full_patch_path = content_dir / f"EE2X-content-full-{version}.pwr"
    _run_command([butler_exe, "diff", os.devnull, str(input_dir), str(full_patch_path)], cwd=content_dir)
    full_sig_path = Path(f"{full_patch_path}.sig")

    manifest_payload: dict[str, Any] = {
        "schemaVersion": 1,
        "version": version,
        "deltaFrom": previous_release_id.strip(),
        "full": {
            "fileName": full_patch_path.name,
            "sha256": sha256_file(full_patch_path),
            "size": full_patch_path.stat().st_size,
            "signatureFileName": full_sig_path.name,
            "signatureSha256": sha256_file(full_sig_path),
            "signatureSize": full_sig_path.stat().st_size,
        },
    }

    if previous_content_dir is not None and previous_content_dir.exists():
        delta_patch_path = content_dir / f"EE2X-content-delta-{previous_release_id or 'prev'}-to-{version}.pwr"
        _run_command([butler_exe, "diff", str(previous_content_dir), str(input_dir), str(delta_patch_path)], cwd=content_dir)
        delta_sig_path = Path(f"{delta_patch_path}.sig")
        manifest_payload["delta"] = {
            "fileName": delta_patch_path.name,
            "sha256": sha256_file(delta_patch_path),
            "size": delta_patch_path.stat().st_size,
            "signatureFileName": delta_sig_path.name,
            "signatureSha256": sha256_file(delta_sig_path),
            "signatureSize": delta_sig_path.stat().st_size,
        }

    manifest_path = content_dir / "content-manifest.json"
    save_json(manifest_path, manifest_payload)
    return manifest_path


def _build_launcher_feed(
    *,
    launcher_dir: Path,
    feed_dir: Path,
    version: str,
    channel: str,
    vpk_command: str,
    launcher_pack_id: str,
    launcher_main_exe: str,
) -> Path:
    if not vpk_command:
        raise RuntimeError("未配置 vpk 命令，无法构建 launcher feed。")

    feed_dir.mkdir(parents=True, exist_ok=True)
    _run_command(
        [
            vpk_command,
            "pack",
            "--packId",
            launcher_pack_id,
            "--packVersion",
            version,
            "--channel",
            channel,
            "--mainExe",
            launcher_main_exe,
            "--inputDir",
            str(launcher_dir),
            "--outputDir",
            str(feed_dir),
        ],
        cwd=launcher_dir,
    )
    releases_file = feed_dir / f"releases.{channel}.json"
    if not releases_file.exists():
        raise RuntimeError(f"vpk 输出缺少 {releases_file.name}")
    metadata_path = feed_dir / "launcher-feed.json"
    save_json(
        metadata_path,
        {
            "schemaVersion": 1,
            "version": version,
            "channel": channel,
            "packId": launcher_pack_id,
            "mainExe": launcher_main_exe,
            "feedFiles": [str(item.relative_to(feed_dir)).replace("\\", "/") for item in _iter_all_files(feed_dir)],
        },
    )
    return metadata_path


def build_release_bundle(
    *,
    game_root: Path,
    launcher_dir: Path,
    version: str,
    release_notes: str,
    output_root: Path,
    channel: str,
    butler_exe: str,
    vpk_command: str,
    launcher_pack_id: str,
    launcher_main_exe: str,
    previous_content_dir: Path | None = None,
    previous_release_id: str = "",
    extra_cleanup_paths: list[str] | None = None,
) -> ReleaseBundleBuildResult:
    game_root = game_root.resolve()
    launcher_dir = launcher_dir.resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    release_dir = output_root / version
    if release_dir.exists():
        shutil.rmtree(release_dir)
    release_dir.mkdir(parents=True, exist_ok=True)

    notes_path = release_dir / "release-notes.txt"
    save_text(notes_path, release_notes)

    launcher_feed_dir = release_dir / "launcher" / "feed"
    runtime_dir = release_dir / "runtime"
    content_dir = release_dir / "content"
    cleanup_dir = release_dir / "cleanup"
    cleanup_dir.mkdir(parents=True, exist_ok=True)

    _build_launcher_feed(
        launcher_dir=launcher_dir,
        feed_dir=launcher_feed_dir,
        version=version,
        channel=channel,
        vpk_command=vpk_command,
        launcher_pack_id=launcher_pack_id,
        launcher_main_exe=launcher_main_exe,
    )
    runtime_manifest_path = _build_runtime_bundle(game_root, runtime_dir, version)
    content_manifest_path = _build_content_bundle(
        game_root=game_root,
        launcher_dir=launcher_dir,
        content_dir=content_dir,
        version=version,
        previous_content_dir=previous_content_dir,
        previous_release_id=previous_release_id,
        butler_exe=butler_exe,
    )

    cleanup_manifest_path = cleanup_dir / "legacy-paths.json"
    cleanup_paths = list(DEFAULT_LEGACY_PATHS)
    for item in extra_cleanup_paths or []:
        rel_path = normalize_relpath(item)
        if rel_path and rel_path not in cleanup_paths:
            cleanup_paths.append(rel_path)
    save_json(cleanup_manifest_path, {"legacyPaths": cleanup_paths})

    bundle_meta_path = release_dir / "bundle-meta.json"
    save_json(
        bundle_meta_path,
        {
            "bundleFormat": BUNDLE_FORMAT,
            "bundleVersion": BUNDLE_VERSION,
            "releaseId": version,
            "version": version,
            "channel": channel,
            "required": True,
            "launcher": {
                "feedDir": "launcher/feed",
                "channel": channel,
            },
            "runtime": {
                "manifestPath": "runtime/runtime-manifest.json",
                "packageFileName": read_json(runtime_manifest_path)["packageFileName"],
            },
            "content": {
                "manifestPath": "content/content-manifest.json",
            },
            "cleanup": {
                "manifestPath": "cleanup/legacy-paths.json",
            },
        },
    )

    return ReleaseBundleBuildResult(
        release_dir=release_dir,
        bundle_meta_path=bundle_meta_path,
        runtime_manifest_path=runtime_manifest_path,
        content_manifest_path=content_manifest_path,
        launcher_feed_dir=launcher_feed_dir,
        notes_path=notes_path,
    )


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_release_bundle_zip(release_dir: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for item in _iter_all_files(release_dir):
            archive.write(item, arcname=str(item.relative_to(release_dir)).replace("\\", "/"))
