from __future__ import annotations

import zipfile
from datetime import datetime, timezone
from pathlib import Path

from .constants import (
    APPLY_MODE_OVERLAY,
    PROTECTED_RELATIVE_PATHS,
    RELEASE_MANIFEST_NAME,
    RELEASE_NOTES_NAME,
    ROOT_DIR_NAME,
    SCHEMA_VERSION,
)
from .hash_utils import sha256_file
from .json_utils import save_json, save_text
from .models import LatestRelease, ManifestFileEntry, ReleaseManifest, ValidationResult
from .package_rules import validate_selection
from .path_utils import normalize_relpath, relative_to_root, safe_release_id


def collect_selected_files(game_root: Path, selected_paths: list[Path]) -> dict[str, Path]:
    files: dict[str, Path] = {}
    for raw_path in selected_paths:
        path = raw_path.resolve()
        if path.is_dir():
            for child in sorted(path.rglob("*")):
                if child.is_file():
                    rel = relative_to_root(game_root, child)
                    files[rel] = child
        elif path.is_file():
            rel = relative_to_root(game_root, path)
            files[rel] = path
    return dict(sorted(files.items()))


def build_manifest(
    *,
    version: str,
    package_file_name: str,
    package_sha256: str,
    file_map: dict[str, Path],
    delete_list: list[str],
) -> ReleaseManifest:
    entries = [
        ManifestFileEntry(path=rel_path, size=src_path.stat().st_size, sha256=sha256_file(src_path))
        for rel_path, src_path in file_map.items()
    ]
    return ReleaseManifest(
        schemaVersion=SCHEMA_VERSION,
        version=version,
        rootDirName=ROOT_DIR_NAME,
        packageFileName=package_file_name,
        packageSha256=package_sha256,
        applyMode=APPLY_MODE_OVERLAY,
        protectedPaths=list(PROTECTED_RELATIVE_PATHS),
        deleteList=[normalize_relpath(item) for item in delete_list if normalize_relpath(item)],
        files=entries,
    )


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
    release_dir.mkdir(parents=True, exist_ok=True)

    package_file_name = f"EE2X-{release_id}.zip"
    package_path = release_dir / package_file_name

    with zipfile.ZipFile(package_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for rel_path, src_path in file_map.items():
            archive_name = f"{ROOT_DIR_NAME}/{rel_path}"
            archive.write(src_path, archive_name)

    package_sha256 = sha256_file(package_path)
    manifest = build_manifest(
        version=version,
        package_file_name=package_file_name,
        package_sha256=package_sha256,
        file_map=file_map,
        delete_list=delete_list,
    )

    save_json(release_dir / RELEASE_MANIFEST_NAME, manifest.to_dict())
    save_text(release_dir / RELEASE_NOTES_NAME, release_notes.strip() + "\n")
    save_json(
        release_dir / "release-meta.json",
        {
            "version": version,
            "releaseId": release_id,
            "packageFileName": package_file_name,
            "packageSha256": package_sha256,
            "packageSize": package_path.stat().st_size,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "selectedFiles": list(file_map.keys()),
            "deleteList": manifest.deleteList,
        },
    )
    return release_dir, manifest, validation


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
) -> LatestRelease:
    return LatestRelease(
        schemaVersion=SCHEMA_VERSION,
        channel=channel,
        version=version,
        releaseNotes=release_notes,
        manifestUrl=manifest_url,
        packageUrl=package_url,
        packageSha256=package_sha256,
        packageSize=package_size,
        publishedAt=published_at,
    )
