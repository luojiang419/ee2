from __future__ import annotations

import zipfile
from datetime import datetime, timezone
from pathlib import Path

from .constants import (
    APPLY_MODE_OVERLAY,
    BUNDLE_FORMAT,
    BUNDLE_VERSION,
    BLOCKED_SELECTION_PREFIXES,
    LAUNCHER_DIR_NAME,
    PACKAGE_SCOPE_GAME,
    PACKAGE_SCOPE_LAUNCHER,
    PROTECTED_RELATIVE_PATHS,
    RELEASE_MANIFEST_NAME,
    RELEASE_NOTES_NAME,
    ROOT_DIR_NAME,
    SCHEMA_VERSION,
)
from .hash_utils import sha256_file
from .json_utils import save_json, save_text
from .models import LatestRelease, ManifestFileEntry, ReleaseManifest, ReleasePackage, ValidationIssue, ValidationResult
from .package_rules import validate_selection
from .path_utils import normalize_relpath, path_is_within_prefixes, relative_to_root, safe_release_id


def collect_selected_files(content_root: Path, selected_paths: list[Path]) -> dict[str, Path]:
    files: dict[str, Path] = {}
    resolved_root = content_root.resolve()
    for raw_path in selected_paths:
        path = raw_path.resolve()
        if path.is_dir():
            for child in sorted(path.rglob("*")):
                if child.is_file():
                    rel = normalize_relpath(str(child.resolve().relative_to(resolved_root)))
                    files[rel] = child
        elif path.is_file():
            rel = normalize_relpath(str(path.resolve().relative_to(resolved_root)))
            files[rel] = path
    return dict(sorted(files.items()))


def build_manifest(
    *,
    version: str,
    package_file_name: str,
    package_sha256: str,
    file_map: dict[str, Path],
    delete_list: list[str],
    root_dir_name: str = ROOT_DIR_NAME,
) -> ReleaseManifest:
    entries = [
        ManifestFileEntry(path=rel_path, size=src_path.stat().st_size, sha256=sha256_file(src_path))
        for rel_path, src_path in file_map.items()
    ]
    return ReleaseManifest(
        schemaVersion=SCHEMA_VERSION,
        version=version,
        rootDirName=root_dir_name,
        packageFileName=package_file_name,
        packageSha256=package_sha256,
        applyMode=APPLY_MODE_OVERLAY,
        protectedPaths=list(PROTECTED_RELATIVE_PATHS),
        deleteList=[normalize_relpath(item) for item in delete_list if normalize_relpath(item)],
        files=entries,
    )


def _write_package_zip(package_path: Path, root_dir_name: str, file_map: dict[str, Path]) -> None:
    with zipfile.ZipFile(package_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        if not file_map:
            archive.writestr(f"{root_dir_name}/", "")
        for rel_path, src_path in file_map.items():
            archive_name = f"{root_dir_name}/{rel_path}"
            archive.write(src_path, archive_name)


def write_release_bundle_zip(release_dir: Path, bundle_path: Path) -> Path:
    bundle_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for file_path in sorted(release_dir.rglob("*")):
            if not file_path.is_file():
                continue
            archive.write(file_path, file_path.relative_to(release_dir).as_posix())
    return bundle_path


def write_release_bundle_from_file_map(
    *,
    version: str,
    release_notes: str,
    file_map: dict[str, Path],
    delete_list: list[str],
    output_dir: Path,
    package_file_name: str,
    root_dir_name: str,
    package_scope: str,
    write_notes: bool,
) -> tuple[Path, ReleaseManifest]:
    output_dir.mkdir(parents=True, exist_ok=True)
    package_path = output_dir / package_file_name
    _write_package_zip(package_path, root_dir_name, file_map)

    package_sha256 = sha256_file(package_path)
    manifest = build_manifest(
        version=version,
        package_file_name=package_file_name,
        package_sha256=package_sha256,
        file_map=file_map,
        delete_list=delete_list,
        root_dir_name=root_dir_name,
    )

    save_json(output_dir / RELEASE_MANIFEST_NAME, manifest.to_dict())
    if write_notes:
        save_text(output_dir / RELEASE_NOTES_NAME, release_notes.strip() + "\n")
    save_json(
        output_dir / "release-meta.json",
        {
            "version": version,
            "packageScope": package_scope,
            "rootDirName": root_dir_name,
            "packageFileName": package_file_name,
            "packageSha256": package_sha256,
            "packageSize": package_path.stat().st_size,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "selectedFiles": list(file_map.keys()),
            "deleteList": manifest.deleteList,
        },
    )
    return output_dir, manifest


def create_release_bundle(
    *,
    game_root: Path,
    version: str,
    release_notes: str,
    selected_paths: list[Path],
    delete_list: list[str],
    output_root: Path,
    allow_override: bool = False,
) -> tuple[Path, ReleaseManifest, ValidationResult]:
    file_map = collect_selected_files(game_root, selected_paths)
    validation = validate_selection(list(file_map.keys()) + delete_list, allow_override=allow_override)
    if validation.has_errors:
        return output_root, ReleaseManifest(0, "", "", "", "", "", [], [], []), validation

    release_id = safe_release_id(version)
    release_dir = output_root / release_id
    package_file_name = f"EE2X-{release_id}.zip"
    _, manifest = write_release_bundle_from_file_map(
        version=version,
        release_notes=release_notes,
        file_map=file_map,
        delete_list=delete_list,
        output_dir=release_dir,
        package_file_name=package_file_name,
        root_dir_name=ROOT_DIR_NAME,
        package_scope=PACKAGE_SCOPE_GAME,
        write_notes=True,
    )
    return release_dir, manifest, validation


def classify_relative_path(relative_path: str) -> str:
    normalized = normalize_relpath(relative_path)
    if normalized == LAUNCHER_DIR_NAME or normalized.startswith(f"{LAUNCHER_DIR_NAME}/"):
        return PACKAGE_SCOPE_LAUNCHER
    return PACKAGE_SCOPE_GAME


def strip_launcher_prefix(relative_path: str) -> str:
    normalized = normalize_relpath(relative_path)
    prefix = normalize_relpath(LAUNCHER_DIR_NAME)
    if normalized == prefix:
        return ""
    if normalized.startswith(f"{prefix}/"):
        return normalize_relpath(normalized[len(prefix) + 1 :])
    return normalized


def split_selected_paths_by_scope(game_root: Path, selected_paths: list[Path]) -> tuple[dict[str, list[Path]], dict[str, list[str]]]:
    absolute_items = {
        PACKAGE_SCOPE_GAME: [],
        PACKAGE_SCOPE_LAUNCHER: [],
    }
    relative_items = {
        PACKAGE_SCOPE_GAME: [],
        PACKAGE_SCOPE_LAUNCHER: [],
    }
    for item in selected_paths:
        rel = relative_to_root(game_root, item)
        scope = classify_relative_path(rel)
        absolute_items[scope].append(item.resolve())
        if scope == PACKAGE_SCOPE_LAUNCHER:
            stripped = strip_launcher_prefix(rel)
            relative_items[scope].append(stripped or ".")
        else:
            relative_items[scope].append(rel)
    return absolute_items, relative_items


def _launcher_scope_blocked_prefixes() -> list[str]:
    launcher_prefix = normalize_relpath(LAUNCHER_DIR_NAME)
    result: list[str] = []
    for item in BLOCKED_SELECTION_PREFIXES:
        normalized = normalize_relpath(item)
        if normalized == launcher_prefix:
            continue
        if normalized.startswith(f"{launcher_prefix}/"):
            stripped = normalize_relpath(normalized[len(launcher_prefix) + 1 :])
            if stripped:
                result.append(stripped)
    return result


def _filter_blocked_file_map(
    file_map: dict[str, Path],
    blocked_prefixes: list[str],
) -> tuple[dict[str, Path], list[str]]:
    kept: dict[str, Path] = {}
    excluded: list[str] = []
    for rel_path, src_path in file_map.items():
        normalized = normalize_relpath(rel_path)
        if path_is_within_prefixes(normalized, blocked_prefixes):
            excluded.append(normalized)
            continue
        kept[normalized] = src_path
    return kept, excluded


def collect_dual_file_maps(game_root: Path, selected_paths: list[Path]) -> dict[str, dict[str, Path]]:
    selected_by_scope_abs, _selected_by_scope_rel = split_selected_paths_by_scope(game_root, selected_paths)
    return {
        PACKAGE_SCOPE_LAUNCHER: collect_selected_files(game_root / LAUNCHER_DIR_NAME, selected_by_scope_abs[PACKAGE_SCOPE_LAUNCHER]),
        PACKAGE_SCOPE_GAME: collect_selected_files(game_root, selected_by_scope_abs[PACKAGE_SCOPE_GAME]),
    }


def split_delete_list_by_scope(delete_list: list[str]) -> dict[str, list[str]]:
    result = {
        PACKAGE_SCOPE_GAME: [],
        PACKAGE_SCOPE_LAUNCHER: [],
    }
    for item in delete_list:
        normalized = normalize_relpath(item)
        if not normalized:
            continue
        scope = classify_relative_path(normalized)
        if scope == PACKAGE_SCOPE_LAUNCHER:
            stripped = strip_launcher_prefix(normalized)
            if stripped:
                result[scope].append(stripped)
        else:
            result[scope].append(normalized)
    return result


def suggest_release_notes(selected_relative_paths: list[str], delete_list: list[str]) -> str:
    grouped_selected = {
        PACKAGE_SCOPE_GAME: [],
        PACKAGE_SCOPE_LAUNCHER: [],
    }
    grouped_deleted = {
        PACKAGE_SCOPE_GAME: [],
        PACKAGE_SCOPE_LAUNCHER: [],
    }
    for item in selected_relative_paths:
        normalized = normalize_relpath(item)
        if not normalized:
            continue
        grouped_selected[classify_relative_path(normalized)].append(normalized)
    for item in delete_list:
        normalized = normalize_relpath(item)
        if not normalized:
            continue
        grouped_deleted[classify_relative_path(normalized)].append(normalized)

    def _render_lines(title: str, values: list[str]) -> list[str]:
        lines = [f"{title}:"]
        if not values:
            lines.append("- 无变更")
            return lines
        for value in values[:12]:
            lines.append(f"- {value}")
        if len(values) > 12:
            lines.append(f"- 其余 {len(values) - 12} 项已一并纳入")
        return lines

    notes_lines: list[str] = []
    notes_lines.extend(_render_lines("启动器内容", grouped_selected[PACKAGE_SCOPE_LAUNCHER]))
    notes_lines.append("")
    notes_lines.extend(_render_lines("游戏内容", grouped_selected[PACKAGE_SCOPE_GAME]))
    if grouped_deleted[PACKAGE_SCOPE_LAUNCHER] or grouped_deleted[PACKAGE_SCOPE_GAME]:
        notes_lines.append("")
        notes_lines.extend(_render_lines("删除项", grouped_deleted[PACKAGE_SCOPE_LAUNCHER] + grouped_deleted[PACKAGE_SCOPE_GAME]))
    return "\n".join(notes_lines).strip()


def bump_patch_version(version: str) -> str:
    raw = str(version or "").strip()
    if not raw:
        return "0.1.0"
    prefix = "v" if raw.lower().startswith("v") else ""
    core = raw[1:] if prefix else raw
    parts = core.split(".")
    numeric: list[int] = []
    for item in parts:
        digits = "".join(ch for ch in item if ch.isdigit())
        numeric.append(int(digits or "0"))
    while len(numeric) < 3:
        numeric.append(0)
    numeric = numeric[:3]
    numeric[2] += 1
    return prefix + ".".join(str(item) for item in numeric)


def create_dual_release_bundle(
    *,
    game_root: Path,
    version: str,
    release_notes: str,
    selected_paths: list[Path],
    delete_list: list[str],
    output_root: Path,
    allow_override: bool = False,
) -> tuple[Path, dict[str, ReleaseManifest], ValidationResult]:
    selected_relative_paths = [relative_to_root(game_root, item) for item in selected_paths]
    validation = ValidationResult()
    if not selected_paths and not [item for item in delete_list if normalize_relpath(item)]:
        validation.issues.append(
            ValidationIssue(
                level="error",
                code="empty-selection",
                message="至少选择一个文件/文件夹，或填写一个删除项。",
            )
        )
    if validation.has_errors:
        return output_root, {}, validation

    release_id = safe_release_id(version)
    release_dir = output_root / release_id
    release_dir.mkdir(parents=True, exist_ok=True)
    save_text(release_dir / RELEASE_NOTES_NAME, release_notes.strip() + "\n")

    selected_by_scope_abs, selected_by_scope_rel = split_selected_paths_by_scope(game_root, selected_paths)
    delete_by_scope = split_delete_list_by_scope(delete_list)
    manifests: dict[str, ReleaseManifest] = {}
    final_selected_relative_paths: list[str] = []
    auto_excluded_relative_paths: list[str] = []
    release_meta: dict[str, object] = {
        "bundleFormat": BUNDLE_FORMAT,
        "bundleVersion": BUNDLE_VERSION,
        "version": version,
        "releaseId": release_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "selectedFiles": selected_relative_paths,
        "deleteList": [normalize_relpath(item) for item in delete_list if normalize_relpath(item)],
        "autoExcludedProtectedFiles": auto_excluded_relative_paths,
        "packageScopes": {},
    }

    scope_definitions = {
        PACKAGE_SCOPE_LAUNCHER: {
            "contentRoot": game_root / LAUNCHER_DIR_NAME,
            "rootDirName": LAUNCHER_DIR_NAME,
            "packageFileName": f"EE2X-launcher-{release_id}.zip",
            "outputDir": release_dir / PACKAGE_SCOPE_LAUNCHER,
            "blockedPrefixes": _launcher_scope_blocked_prefixes(),
        },
        PACKAGE_SCOPE_GAME: {
            "contentRoot": game_root,
            "rootDirName": ROOT_DIR_NAME,
            "packageFileName": f"EE2X-game-{release_id}.zip",
            "outputDir": release_dir / PACKAGE_SCOPE_GAME,
            "blockedPrefixes": [],
        },
    }

    for scope, definition in scope_definitions.items():
        file_map = collect_selected_files(definition["contentRoot"], selected_by_scope_abs[scope])
        excluded_scope_paths: list[str] = []
        blocked_prefixes = definition["blockedPrefixes"]
        if blocked_prefixes:
            file_map, excluded_scope_paths = _filter_blocked_file_map(file_map, blocked_prefixes)
            if excluded_scope_paths:
                auto_excluded_relative_paths.extend(
                    f"{LAUNCHER_DIR_NAME}/{item}" for item in excluded_scope_paths
                )
                validation.issues.append(
                    ValidationIssue(
                        level="warning",
                        code="auto-excluded-protected-launcher-state",
                        message="已自动排除启动器本地状态目录（Config/Logs/data/userdata/update/runtime），其余启动器文件将继续打包。",
                        details=(excluded_scope_paths[:12] + ([f"其余 {len(excluded_scope_paths) - 12} 项已一并排除"] if len(excluded_scope_paths) > 12 else [])),
                    )
                )

        if scope == PACKAGE_SCOPE_LAUNCHER:
            final_selected_relative_paths.extend(
                f"{LAUNCHER_DIR_NAME}/{path}" for path in file_map.keys()
            )
        else:
            final_selected_relative_paths.extend(file_map.keys())

        _, manifest = write_release_bundle_from_file_map(
            version=version,
            release_notes=release_notes,
            file_map=file_map,
            delete_list=delete_by_scope[scope],
            output_dir=definition["outputDir"],
            package_file_name=definition["packageFileName"],
            root_dir_name=definition["rootDirName"],
            package_scope=scope,
            write_notes=False,
        )
        manifests[scope] = manifest
        release_meta["packageScopes"][scope] = {
            "rootDirName": definition["rootDirName"],
            "selectedFiles": selected_by_scope_rel[scope],
            "includedFiles": list(file_map.keys()),
            "autoExcludedFiles": excluded_scope_paths,
            "deleteList": manifest.deleteList,
            "packageFileName": manifest.packageFileName,
            "packageSha256": manifest.packageSha256,
            "packageSize": (definition["outputDir"] / definition["packageFileName"]).stat().st_size,
        }

    follow_up_validation = validate_selection(final_selected_relative_paths + delete_list, allow_override=allow_override)
    validation.issues.extend(follow_up_validation.issues)
    if not final_selected_relative_paths and not [item for item in delete_list if normalize_relpath(item)]:
        validation.issues.append(
            ValidationIssue(
                level="error",
                code="empty-selection-after-exclusion",
                message="自动排除启动器本地状态文件后，当前没有可导出内容。请选择启动器程序文件，或直接使用“导出启动器程序更新（自动排除本地状态）”预设。",
            )
        )
    if validation.has_errors:
        return output_root, {}, validation

    save_json(release_dir / "release-meta.json", release_meta)
    return release_dir, manifests, validation


def build_latest_descriptor(
    *,
    channel: str,
    version: str,
    release_notes: str,
    manifest_url: str,
    package_url: str,
    package_sha256: str,
    package_size: int,
    published_at: str,
    required: bool = True,
    packages: dict[str, ReleasePackage] | None = None,
) -> LatestRelease:
    return LatestRelease(
        schemaVersion=SCHEMA_VERSION,
        channel=channel,
        version=version,
        releaseNotes=release_notes,
        publishedAt=published_at,
        manifestUrl=manifest_url,
        packageUrl=package_url,
        packageSha256=package_sha256,
        packageSize=package_size,
        required=required,
        packages=packages or {},
    )
