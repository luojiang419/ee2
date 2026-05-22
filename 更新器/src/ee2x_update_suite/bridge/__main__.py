from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

from ee2x_update_suite.v2.bundle import build_release_bundle, write_release_bundle_zip
from ee2x_update_suite.v2.http_backend import (
    fetch_history,
    fetch_manifest,
    load_publish_config,
    promote_release_http,
    publish_bundle_http,
    rollback_release_http,
)


def _looks_like_updater_root(path: Path) -> bool:
    return (path / "config" / "publish.local.json").exists() and (path / "src" / "ee2x_update_suite").exists()


def workspace_root() -> Path:
    explicit = os.environ.get("EE2X_UPDATER_WORKSPACE", "").strip()
    if explicit:
      candidate = Path(explicit).resolve()
      if _looks_like_updater_root(candidate):
        return candidate

    candidates: list[Path] = []
    cwd = Path.cwd().resolve()
    candidates.extend([cwd, cwd / "更新器"])

    if getattr(sys, "frozen", False):
        exe_path = Path(sys.executable).resolve()
        for parent in [exe_path.parent, *exe_path.parents]:
            candidates.extend([parent, parent / "更新器"])

    source_path = Path(__file__).resolve()
    candidates.extend([source_path.parents[3], source_path.parents[4] / "更新器"])

    seen: set[str] = set()
    for candidate in candidates:
        key = str(candidate)
        if key in seen:
            continue
        seen.add(key)
        if _looks_like_updater_root(candidate):
            return candidate

    raise RuntimeError("未找到更新器工作目录（缺少 config/publish.local.json 或 src/ee2x_update_suite）。")


def default_publish_config_path() -> Path:
    return workspace_root() / "config" / "publish.local.json"


def resolve_config_path(raw_value: str) -> Path:
    if raw_value.strip():
        return Path(raw_value).resolve()
    return default_publish_config_path().resolve()


def release_output_root(raw_config_value: str) -> Path:
    if raw_config_value.strip():
        config_path = Path(raw_config_value).resolve()
        if config_path.parent.name.lower() == "config":
            return config_path.parent.parent / "releases-v2"
    return workspace_root() / "releases-v2"


def bump_patch_version(version: str) -> str:
    text = str(version or "").strip()
    if not text:
        return "2.0.0"
    parts = text.split(".")
    while len(parts) < 3:
        parts.append("0")
    try:
        parts[2] = str(int(parts[2]) + 1)
    except ValueError:
        return "2.0.0"
    return ".".join(parts[:3])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="EE2X v2 发布桥接 CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    info_parser = subparsers.add_parser("remote-info", help="读取 v2 当前频道 manifest 与下一个建议版本")
    info_parser.add_argument("--config", default="", help="发布配置路径，默认使用 更新器/config/publish.local.json")

    history_parser = subparsers.add_parser("release-history", help="读取 v2 当前频道发布历史")
    history_parser.add_argument("--config", default="", help="发布配置路径，默认使用 更新器/config/publish.local.json")

    prepare_parser = subparsers.add_parser("prepare-v2-bundle", help="本地构建 v2 发布目录")
    prepare_parser.add_argument("--root", required=True, help="Empire Earth II 根目录")
    prepare_parser.add_argument("--launcher-dir", default="", help="启动器目录，默认 {root}/地球帝国二代远航版启动器")
    prepare_parser.add_argument("--version", required=True, help="目标发布版本")
    prepare_parser.add_argument("--notes-file", required=True, help="更新说明文本文件")
    prepare_parser.add_argument("--config", default="", help="发布配置路径")
    prepare_parser.add_argument("--previous-content-dir", default="", help="上一版 content 快照目录，用于生成 delta")
    prepare_parser.add_argument("--previous-release-id", default="", help="上一版 releaseId，用于写入 deltaFrom")

    export_parser = subparsers.add_parser("export-v2-bundle", help="本地构建 v2 发布目录并导出单个 bundle ZIP")
    export_parser.add_argument("--root", required=True, help="Empire Earth II 根目录")
    export_parser.add_argument("--launcher-dir", default="", help="启动器目录，默认 {root}/地球帝国二代远航版启动器")
    export_parser.add_argument("--version", required=True, help="目标发布版本")
    export_parser.add_argument("--notes-file", required=True, help="更新说明文本文件")
    export_parser.add_argument("--output", required=True, help="导出的 bundle ZIP 路径")
    export_parser.add_argument("--config", default="", help="发布配置路径")
    export_parser.add_argument("--previous-content-dir", default="", help="上一版 content 快照目录")
    export_parser.add_argument("--previous-release-id", default="", help="上一版 releaseId")

    publish_parser = subparsers.add_parser("publish-v2-bundle", help="上传 v2 bundle 到后端")
    publish_parser.add_argument("--bundle-path", required=True, help="bundle ZIP 路径")
    publish_parser.add_argument("--config", default="", help="发布配置路径")

    promote_parser = subparsers.add_parser("promote-release", help="将某个 release 提升为当前 latest")
    promote_parser.add_argument("--release-id", required=True, help="目标 releaseId")
    promote_parser.add_argument("--config", default="", help="发布配置路径")

    rollback_parser = subparsers.add_parser("rollback-release", help="回滚当前频道到某个旧 release")
    rollback_parser.add_argument("--release-id", required=True, help="目标 releaseId")
    rollback_parser.add_argument("--config", default="", help="发布配置路径")
    return parser.parse_args()


def _resolve_launcher_dir(game_root: Path, raw_value: str) -> Path:
    if raw_value.strip():
        return Path(raw_value).resolve()
    return (game_root / "地球帝国二代远航版启动器").resolve()


def _build_release(args: argparse.Namespace) -> dict:
    config_path = resolve_config_path(args.config)
    config = load_publish_config(config_path)
    game_root = Path(args.root).resolve()
    launcher_dir = _resolve_launcher_dir(game_root, getattr(args, "launcher_dir", ""))
    notes = Path(args.notes_file).resolve().read_text(encoding="utf-8")
    previous_content_dir = Path(args.previous_content_dir).resolve() if str(getattr(args, "previous_content_dir", "")).strip() else None

    result = build_release_bundle(
        game_root=game_root,
        launcher_dir=launcher_dir,
        version=str(args.version).strip(),
        release_notes=notes,
        output_root=release_output_root(args.config),
        channel=config.channel,
        butler_exe=config.butlerExe,
        vpk_command=config.vpkCommand,
        launcher_pack_id=config.launcherPackId,
        launcher_main_exe=config.launcherMainExe,
        previous_content_dir=previous_content_dir,
        previous_release_id=str(getattr(args, "previous_release_id", "")).strip(),
    )
    return {
        "ok": True,
        "releaseDir": str(result.release_dir),
        "bundleMetaPath": str(result.bundle_meta_path),
        "runtimeManifestPath": str(result.runtime_manifest_path),
        "contentManifestPath": str(result.content_manifest_path),
        "launcherFeedDir": str(result.launcher_feed_dir),
        "notesPath": str(result.notes_path),
    }


def command_remote_info(args: argparse.Namespace) -> dict:
    config_path = resolve_config_path(args.config)
    config = load_publish_config(config_path)
    latest = fetch_manifest(config_path)
    return {
        "ok": True,
        "configPath": str(config_path),
        "channel": config.channel,
        "backendBaseUrl": config.backendBaseUrl,
        "latestUrl": f"{config.backendBaseUrl}/api/update/v2/channels/{config.channel}/manifest",
        "latestVersion": str(latest.get("version", "")),
        "nextVersion": bump_patch_version(str(latest.get("version", ""))),
        "releaseNotes": str(latest.get("releaseNotes", "")),
        "required": bool(latest.get("required", True)),
    }


def command_release_history(args: argparse.Namespace) -> dict:
    config_path = resolve_config_path(args.config)
    return fetch_history(config_path)


def command_prepare_bundle(args: argparse.Namespace) -> dict:
    return _build_release(args)


def command_export_bundle(args: argparse.Namespace) -> dict:
    result = _build_release(args)
    if result.get("ok") is not True:
        return result
    release_dir = Path(result["releaseDir"]).resolve()
    output_path = Path(args.output).resolve()
    write_release_bundle_zip(release_dir, output_path)
    result.update(
        {
            "bundlePath": str(output_path),
            "bundleSize": output_path.stat().st_size,
        }
    )
    return result


def command_publish_bundle(args: argparse.Namespace) -> dict:
    config_path = resolve_config_path(args.config)
    bundle_path = Path(args.bundle_path).resolve()
    return publish_bundle_http(bundle_path, config_path)


def command_promote_release(args: argparse.Namespace) -> dict:
    config_path = resolve_config_path(args.config)
    return promote_release_http(config_path, str(args.release_id).strip())


def command_rollback_release(args: argparse.Namespace) -> dict:
    config_path = resolve_config_path(args.config)
    return rollback_release_http(config_path, str(args.release_id).strip())


def main() -> None:
    args = parse_args()
    if args.command == "remote-info":
        payload = command_remote_info(args)
    elif args.command == "release-history":
        payload = command_release_history(args)
    elif args.command == "prepare-v2-bundle":
        payload = command_prepare_bundle(args)
    elif args.command == "export-v2-bundle":
        payload = command_export_bundle(args)
    elif args.command == "publish-v2-bundle":
        payload = command_publish_bundle(args)
    elif args.command == "promote-release":
        payload = command_promote_release(args)
    elif args.command == "rollback-release":
        payload = command_rollback_release(args)
    else:
        raise RuntimeError(f"未知命令: {args.command}")
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
