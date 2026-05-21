from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

from ee2x_update_suite.publisher.http_backend import (
    delete_release_http,
    fetch_release_history,
    fetch_remote_latest,
    load_publish_config,
    publish_release_http,
    read_release_summary,
)
from ee2x_update_suite.shared.constants import PACKAGE_SCOPE_GAME, PACKAGE_SCOPE_LAUNCHER
from ee2x_update_suite.shared.manifest_builder import (
    bump_patch_version,
    create_dual_release_bundle,
    write_release_bundle_zip,
)
from ee2x_update_suite.shared.path_utils import safe_join


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
            return config_path.parent.parent / "releases"
    return workspace_root() / "releases"


def load_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="EE2X Flutter 发布端桥接 CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    info_parser = subparsers.add_parser("remote-info", help="读取发布配置与远端最新版本")
    info_parser.add_argument("--config", default="", help="发布配置路径，默认使用 更新器/config/publish.local.json")

    history_parser = subparsers.add_parser("release-history", help="读取当前频道的远端发布历史")
    history_parser.add_argument("--config", default="", help="发布配置路径，默认使用 更新器/config/publish.local.json")
    history_parser.add_argument("--limit", type=int, default=0, help="返回历史条目数量上限；0 表示全部")

    delete_parser = subparsers.add_parser("delete-release", help="删除当前频道的某个远端发布版本")
    delete_parser.add_argument("--config", default="", help="发布配置路径，默认使用 更新器/config/publish.local.json")
    delete_parser.add_argument("--release-id", required=True, help="要删除的 releaseId")

    prepare_parser = subparsers.add_parser("prepare-dual", help="本地构建双包发布产物")
    prepare_parser.add_argument("--root", required=True, help="Empire Earth II 根目录")
    prepare_parser.add_argument("--version", required=True, help="目标发布版本")
    prepare_parser.add_argument("--notes-file", required=True, help="更新说明文本文件")
    prepare_parser.add_argument("--selection-file", required=True, help="勾选路径列表文件（相对 Empire Earth II 根目录）")
    prepare_parser.add_argument("--config", default="", help="发布配置路径，用于推导工作目录，默认使用 更新器/config/publish.local.json")
    prepare_parser.add_argument("--allow-override", action="store_true", help="允许越过敏感同步告警继续构建")

    export_parser = subparsers.add_parser("export-bundle", help="本地构建双包发布产物并导出为单个更新包 ZIP")
    export_parser.add_argument("--root", required=True, help="Empire Earth II 根目录")
    export_parser.add_argument("--version", required=True, help="目标发布版本")
    export_parser.add_argument("--notes-file", required=True, help="更新说明文本文件")
    export_parser.add_argument("--selection-file", required=True, help="勾选路径列表文件（相对 Empire Earth II 根目录）")
    export_parser.add_argument("--output", required=True, help="导出的单文件更新包路径")
    export_parser.add_argument("--allow-override", action="store_true", help="允许越过敏感同步告警继续构建")

    publish_parser = subparsers.add_parser("publish-http", help="将本地双包产物上传到新更新后端")
    publish_parser.add_argument("--release-dir", required=True, help="prepare-dual 生成的本地发布目录")
    publish_parser.add_argument("--config", default="", help="发布配置路径，默认使用 更新器/config/publish.local.json")

    legacy_publish_parser = subparsers.add_parser("publish-dual", help="兼容入口：本地构建后直接推送双包发布")
    legacy_publish_parser.add_argument("--root", required=True, help="Empire Earth II 根目录")
    legacy_publish_parser.add_argument("--version", required=True, help="目标发布版本")
    legacy_publish_parser.add_argument("--notes-file", required=True, help="更新说明文本文件")
    legacy_publish_parser.add_argument("--selection-file", required=True, help="勾选路径列表文件（相对 Empire Earth II 根目录）")
    legacy_publish_parser.add_argument("--config", default="", help="发布配置路径，默认使用 更新器/config/publish.local.json")
    legacy_publish_parser.add_argument("--allow-override", action="store_true", help="允许越过敏感同步告警继续发布")
    return parser.parse_args()


def command_remote_info(args: argparse.Namespace) -> dict:
    config_path = resolve_config_path(args.config)
    config = load_publish_config(config_path)
    latest = fetch_remote_latest(config_path)
    return {
        "ok": True,
        "configPath": str(config_path),
        "channel": config.channel,
        "publicBaseUrl": config.backendBaseUrl,
        "latestUrl": f"{config.backendBaseUrl}/api/update/v1/channels/{config.channel}/latest",
        "latestVersion": latest.version if latest else "",
        "nextVersion": bump_patch_version(latest.version if latest else ""),
        "required": latest.required if latest else True,
        "releaseNotes": latest.releaseNotes if latest else "",
    }


def command_release_history(args: argparse.Namespace) -> dict:
    config_path = resolve_config_path(args.config)
    return fetch_release_history(config_path, limit=max(0, int(args.limit)))


def command_delete_release(args: argparse.Namespace) -> dict:
    config_path = resolve_config_path(args.config)
    return delete_release_http(config_path, release_id=str(args.release_id).strip())


def _load_selected_paths(game_root: Path, selection_file: Path) -> tuple[list[str], list[Path]]:
    selected_relative_paths = load_lines(selection_file)
    selected_paths = [safe_join(game_root, relative_path) for relative_path in selected_relative_paths]
    return selected_relative_paths, selected_paths


def command_prepare_dual(args: argparse.Namespace) -> dict:
    game_root = Path(args.root).resolve()
    notes = Path(args.notes_file).resolve().read_text(encoding="utf-8")
    selected_relative_paths, selected_paths = _load_selected_paths(game_root, Path(args.selection_file).resolve())

    release_dir, manifests, validation = create_dual_release_bundle(
        game_root=game_root,
        version=args.version,
        release_notes=notes,
        selected_paths=selected_paths,
        delete_list=[],
        output_root=release_output_root(args.config),
        allow_override=args.allow_override,
    )
    if validation.has_errors:
        return {
            "ok": False,
            "releaseDir": str(release_dir),
            "validation": validation.to_dict(),
        }

    return {
        "ok": True,
        "releaseDir": str(release_dir),
        "validation": validation.to_dict(),
        "selectedPaths": selected_relative_paths,
        "manifests": {scope: manifest.to_dict() for scope, manifest in manifests.items()},
        **read_release_summary(release_dir),
    }


def command_export_bundle(args: argparse.Namespace) -> dict:
    game_root = Path(args.root).resolve()
    notes = Path(args.notes_file).resolve().read_text(encoding="utf-8")
    _, selected_paths = _load_selected_paths(game_root, Path(args.selection_file).resolve())
    output_path = Path(args.output).resolve()

    with tempfile.TemporaryDirectory(prefix="ee2x-bundle-") as temp_dir_text:
        temp_root = Path(temp_dir_text)
        release_dir, _manifests, validation = create_dual_release_bundle(
            game_root=game_root,
            version=args.version,
            release_notes=notes,
            selected_paths=selected_paths,
            delete_list=[],
            output_root=temp_root,
            allow_override=args.allow_override,
        )
        if validation.has_errors:
            return {
                "ok": False,
                "releaseDir": str(release_dir),
                "bundlePath": str(output_path),
                "validation": validation.to_dict(),
            }

        write_release_bundle_zip(release_dir, output_path)
        summary = read_release_summary(release_dir)
        return {
            "ok": True,
            "releaseDir": str(release_dir),
            "bundlePath": str(output_path),
            "bundleSize": output_path.stat().st_size,
            "releaseId": release_dir.name,
            "validation": validation.to_dict(),
            **summary,
        }


def command_publish_http(args: argparse.Namespace) -> dict:
    config_path = resolve_config_path(args.config)
    release_dir = Path(args.release_dir).resolve()
    publish_result = publish_release_http(release_dir, config_path)
    return {
        "ok": True,
        "releaseDir": str(release_dir),
        "publish": publish_result,
    }


def command_publish_dual_legacy(args: argparse.Namespace) -> dict:
    prepared = command_prepare_dual(args)
    if prepared.get("ok") is not True:
        return prepared
    published = command_publish_http(argparse.Namespace(release_dir=prepared["releaseDir"], config=args.config))
    result = dict(prepared)
    result.update(published)
    return result


def main() -> None:
    args = parse_args()
    try:
        if args.command == "remote-info":
            payload = command_remote_info(args)
        elif args.command == "release-history":
            payload = command_release_history(args)
        elif args.command == "delete-release":
            payload = command_delete_release(args)
        elif args.command == "prepare-dual":
            payload = command_prepare_dual(args)
        elif args.command == "export-bundle":
            payload = command_export_bundle(args)
        elif args.command == "publish-http":
            payload = command_publish_http(args)
        elif args.command == "publish-dual":
            payload = command_publish_dual_legacy(args)
        else:
            raise RuntimeError(f"未知命令: {args.command}")
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False, indent=2))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
