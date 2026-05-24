from __future__ import annotations

import base64
import hashlib
import json
import re
import shutil
import sqlite3
import tempfile
import zipfile
from contextlib import ExitStack
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any
import fnmatch

from fastapi import HTTPException, UploadFile, status

from .config import Settings
from .db import db_session

PACKAGE_SCOPES = ("launcher", "game")
ROOT_DIRS = {
    "launcher": "地球帝国二代远航版启动器",
    "game": "Empire Earth II",
}
BUNDLE_FORMAT = "ee2x-release-bundle"
BUNDLE_VERSION = 1


@dataclass(slots=True)
class PackagePayload:
    scope: str
    manifest: dict[str, Any]
    manifest_bytes: bytes
    package_sha256: str
    package_size: int
    package_file_name: str
    package_temp_path: Path


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_relpath(value: str) -> str:
    cleaned = str(value).replace("\\", "/").strip().strip("/")
    while "//" in cleaned:
        cleaned = cleaned.replace("//", "/")
    return cleaned


def safe_release_id(version: str) -> str:
    sanitized = re.sub(r"[^0-9A-Za-z._-]+", "_", version.strip())
    return sanitized.strip("._-") or "release"


def latest_static_url(settings: Settings, channel: str) -> str:
    return f"{settings.static_base_url}/updates/{channel}/latest.json"


def release_scope_dir(settings: Settings, channel: str, release_id: str, scope: str) -> Path:
    return settings.storage_updates_dir / channel / "releases" / release_id / scope


def release_notes_path(settings: Settings, channel: str, release_id: str) -> Path:
    return settings.storage_updates_dir / channel / "releases" / release_id / "release-notes.txt"


def release_meta_path(settings: Settings, channel: str, release_id: str) -> Path:
    return settings.storage_updates_dir / channel / "releases" / release_id / "release-meta.json"


def static_latest_path(settings: Settings, channel: str) -> Path:
    return settings.storage_updates_dir / channel / "latest.json"


def package_public_urls(settings: Settings, channel: str, release_id: str, scope: str, package_file_name: str) -> dict[str, str]:
    base = f"{settings.static_base_url}/updates/{channel}/releases/{release_id}/{scope}"
    return {
        "manifestUrl": f"{base}/release-manifest.json",
        "packageUrl": f"{base}/{package_file_name}",
    }


def _package_has_client_visible_change(*, file_count: int, delete_count: int) -> bool:
    return bool((file_count or 0) > 0)


def _json_dump(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _json_load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _path_is_within_prefixes(path_value: str, prefixes: tuple[str, ...]) -> bool:
    normalized = normalize_relpath(path_value)
    for prefix in prefixes:
        normalized_prefix = normalize_relpath(prefix)
        if normalized == normalized_prefix or normalized.startswith(f"{normalized_prefix}/"):
            return True
    return False


def _fetchone_dict(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    row = conn.execute(sql, params).fetchone()
    return dict(row) if row else None


def _fetchall_dicts(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in conn.execute(sql, params).fetchall()]


def _storage_path_from_relative(settings: Settings, relative_path: str) -> Path:
    normalized = normalize_relpath(relative_path)
    if not normalized:
        return settings.storage_updates_dir
    return settings.storage_updates_dir.joinpath(*PurePosixPath(normalized).parts)


def _find_existing_path(candidates: list[Path]) -> Path | None:
    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def verify_publish_username_password(settings: Settings, username: str, password: str) -> None:
    expected_username = settings.admin_username.strip() or "ee2x"
    expected_password = settings.admin_password.strip() or "ee2x"
    if username != expected_username or password != expected_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="账号或密码无效。")


def verify_publish_auth(settings: Settings, authorization_header: str | None) -> None:
    actual = (authorization_header or "").strip()
    if not actual.startswith("Basic "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="缺少 Basic Authorization。")
    encoded = actual.split(" ", 1)[1].strip()
    try:
        decoded = base64.b64decode(encoded).decode("utf-8")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Basic Authorization 非法。") from exc
    if ":" not in decoded:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Basic Authorization 非法。")
    username, password = decoded.split(":", 1)
    verify_publish_username_password(settings, username, password)


def _sha256_and_size(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    total_size = 0
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
            total_size += len(chunk)
    return digest.hexdigest(), total_size


def resolve_latest_json_file(settings: Settings, channel: str) -> Path:
    latest_path = static_latest_path(settings, channel)
    if not latest_path.exists() or not latest_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"频道 {channel} 尚无版本。")
    return latest_path


def _get_release_package_with_release(
    conn: sqlite3.Connection,
    *,
    channel: str,
    release_id: str,
    scope: str,
) -> dict[str, Any]:
    if scope not in PACKAGE_SCOPES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"无效的 package scope: {scope}")
    row = _fetchone_dict(
        conn,
        """
        SELECT
            p.*,
            r.id AS release_db_id,
            r.channel AS release_channel,
            r.release_id AS release_slug
        FROM release_packages p
        JOIN releases r ON r.id = p.release_id
        WHERE r.channel = ? AND r.release_id = ? AND p.scope = ?
        """,
        (channel, release_id, scope),
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"频道 {channel} 不存在版本 {release_id} 的 {scope} 包。",
        )
    return row


def resolve_release_manifest_file(
    settings: Settings,
    conn: sqlite3.Connection,
    *,
    channel: str,
    release_id: str,
    scope: str,
) -> Path:
    package_row = _get_release_package_with_release(
        conn,
        channel=channel,
        release_id=release_id,
        scope=scope,
    )
    candidates = [
        _storage_path_from_relative(settings, str(package_row.get("manifest_path", ""))),
        release_scope_dir(settings, channel, release_id, scope) / "release-manifest.json",
    ]
    if scope == "game":
        candidates.append(settings.storage_updates_dir / channel / "releases" / release_id / "release-manifest.json")
    manifest_path = _find_existing_path(candidates)
    if manifest_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"频道 {channel} 版本 {release_id} 的 {scope} manifest 文件不存在。",
        )
    return manifest_path


def resolve_release_package_file(
    settings: Settings,
    conn: sqlite3.Connection,
    *,
    channel: str,
    release_id: str,
    scope: str,
    package_file_name: str,
) -> tuple[Path, dict[str, Any]]:
    package_row = _get_release_package_with_release(
        conn,
        channel=channel,
        release_id=release_id,
        scope=scope,
    )
    expected_name = str(package_row.get("package_file_name", "")).strip()
    if not expected_name or expected_name != package_file_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"频道 {channel} 版本 {release_id} 的 {scope} 包文件不存在。",
        )
    candidates = [
        _storage_path_from_relative(settings, str(package_row.get("package_path", ""))),
        release_scope_dir(settings, channel, release_id, scope) / expected_name,
    ]
    if scope == "game":
        candidates.append(settings.storage_updates_dir / channel / "releases" / release_id / expected_name)
    package_path = _find_existing_path(candidates)
    if package_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"频道 {channel} 版本 {release_id} 的 {scope} 包文件不存在。",
        )
    return package_path, package_row


def increment_release_package_download(conn: sqlite3.Connection, release_package_id: int) -> None:
    conn.execute(
        """
        INSERT INTO release_package_downloads(release_package_id, download_count, last_downloaded_at)
        VALUES (?, ?, ?)
        ON CONFLICT(release_package_id) DO UPDATE SET
            download_count = release_package_downloads.download_count + 1,
            last_downloaded_at = excluded.last_downloaded_at
        """,
        (release_package_id, 1, utc_now_iso()),
    )


async def _write_upload_to_path(upload: UploadFile, target_path: Path) -> None:
    with target_path.open("wb") as handle:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)


def _build_package_payload(
    *,
    scope: str,
    version: str,
    manifest_bytes: bytes,
    package_path: Path,
    require_file_name_match: bool,
) -> PackagePayload:
    try:
        manifest_payload = json.loads(manifest_bytes.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{scope} manifest 不是合法 JSON: {exc}") from exc

    if str(manifest_payload.get("version", "")).strip() != version.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{scope} manifest.version 与请求 version 不一致。")
    if str(manifest_payload.get("rootDirName", "")).strip() != ROOT_DIRS[scope]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{scope} manifest.rootDirName 非法。")

    package_file_name = str(manifest_payload.get("packageFileName", "")).strip() or package_path.name
    if require_file_name_match and package_path.name != package_file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{scope} package 文件名与 manifest.packageFileName 不一致。")

    package_sha256, package_size = _sha256_and_size(package_path)
    if str(manifest_payload.get("packageSha256", "")).strip() != package_sha256:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{scope} package SHA-256 校验失败。")

    return PackagePayload(
        scope=scope,
        manifest=manifest_payload,
        manifest_bytes=manifest_bytes,
        package_sha256=package_sha256,
        package_size=package_size,
        package_file_name=package_file_name,
        package_temp_path=package_path,
    )


def _safe_extract_zip(archive_path: Path, extract_dir: Path) -> None:
    extract_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive_path, "r") as archive:
        for info in archive.infolist():
            raw_name = str(info.filename or "")
            if not raw_name or raw_name.endswith("/"):
                continue
            path_parts = PurePosixPath(raw_name).parts
            if any(part == ".." for part in path_parts) or PurePosixPath(raw_name).is_absolute():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bundle ZIP 含非法路径。")
            target_path = extract_dir.joinpath(*path_parts)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info, "r") as source, target_path.open("wb") as target:
                shutil.copyfileobj(source, target)


async def build_publish_payload(
    *,
    temp_root: Path,
    version: str,
    launcher_manifest: UploadFile,
    launcher_package: UploadFile,
    game_manifest: UploadFile,
    game_package: UploadFile,
) -> tuple[dict[str, PackagePayload], Path]:
    temp_dir = Path(tempfile.mkdtemp(prefix="publish-", dir=str(temp_root)))
    payloads: dict[str, PackagePayload] = {}
    try:
        for scope, manifest_file, package_file in (
            ("launcher", launcher_manifest, launcher_package),
            ("game", game_manifest, game_package),
        ):
            manifest_bytes = await manifest_file.read()
            package_hint_name = Path(package_file.filename or f"{scope}.zip").name
            package_temp_path = temp_dir / f"{scope}-{package_hint_name}"
            await _write_upload_to_path(package_file, package_temp_path)
            payloads[scope] = _build_package_payload(
                scope=scope,
                version=version,
                manifest_bytes=manifest_bytes,
                package_path=package_temp_path,
                require_file_name_match=False,
            )
        return payloads, temp_dir
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise


async def build_publish_payload_from_bundle(
    *,
    temp_root: Path,
    bundle_file: UploadFile,
) -> tuple[str, str, dict[str, PackagePayload], Path]:
    temp_dir = Path(tempfile.mkdtemp(prefix="publish-bundle-", dir=str(temp_root)))
    try:
        bundle_name = Path(bundle_file.filename or "bundle.zip").name or "bundle.zip"
        bundle_path = temp_dir / bundle_name
        await _write_upload_to_path(bundle_file, bundle_path)

        extract_dir = temp_dir / "bundle"
        _safe_extract_zip(bundle_path, extract_dir)

        meta_path = extract_dir / "release-meta.json"
        notes_path = extract_dir / "release-notes.txt"
        launcher_manifest_path = extract_dir / "launcher" / "release-manifest.json"
        game_manifest_path = extract_dir / "game" / "release-manifest.json"
        required_paths = (
            (meta_path, "release-meta.json"),
            (notes_path, "release-notes.txt"),
            (launcher_manifest_path, "launcher/release-manifest.json"),
            (game_manifest_path, "game/release-manifest.json"),
        )
        for path, label in required_paths:
            if not path.exists() or not path.is_file():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"bundle ZIP 缺少必需文件: {label}")

        try:
            release_meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"release-meta.json 不是合法 JSON: {exc}") from exc

        if str(release_meta.get("bundleFormat", "")).strip() != BUNDLE_FORMAT:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="release-meta.json.bundleFormat 非法。")
        if int(release_meta.get("bundleVersion", 0) or 0) != BUNDLE_VERSION:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="release-meta.json.bundleVersion 非法。")

        launcher_manifest_bytes = launcher_manifest_path.read_bytes()
        game_manifest_bytes = game_manifest_path.read_bytes()
        try:
            launcher_manifest_payload = json.loads(launcher_manifest_bytes.decode("utf-8"))
            game_manifest_payload = json.loads(game_manifest_bytes.decode("utf-8"))
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"bundle manifest 解析失败: {exc}") from exc

        launcher_version = str(launcher_manifest_payload.get("version", "")).strip()
        game_version = str(game_manifest_payload.get("version", "")).strip()
        if not launcher_version or not game_version or launcher_version != game_version:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="launcher/game manifest.version 必须存在且保持一致。")

        version = game_version
        launcher_package_name = str(launcher_manifest_payload.get("packageFileName", "")).strip()
        game_package_name = str(game_manifest_payload.get("packageFileName", "")).strip()
        launcher_package_path = extract_dir / "launcher" / launcher_package_name
        game_package_path = extract_dir / "game" / game_package_name
        if not launcher_package_name or not launcher_package_path.exists():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bundle ZIP 缺少 launcher package 文件。")
        if not game_package_name or not game_package_path.exists():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bundle ZIP 缺少 game package 文件。")

        payloads = {
            "launcher": _build_package_payload(
                scope="launcher",
                version=version,
                manifest_bytes=launcher_manifest_bytes,
                package_path=launcher_package_path,
                require_file_name_match=True,
            ),
            "game": _build_package_payload(
                scope="game",
                version=version,
                manifest_bytes=game_manifest_bytes,
                package_path=game_package_path,
                require_file_name_match=True,
            ),
        }
        release_notes = notes_path.read_text(encoding="utf-8").strip()
        return version, release_notes, payloads, temp_dir
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise


def _apply_delete_lists(conn: sqlite3.Connection, channel: str, payloads: dict[str, PackagePayload]) -> tuple[dict[str, list[str]], dict[str, int]]:
    delete_lists: dict[str, list[str]] = {}
    file_counts: dict[str, int] = {}
    for scope, payload in payloads.items():
        current_paths = {
            normalize_relpath(str(item.get("path", "")))
            for item in (payload.manifest.get("files", []) or [])
            if normalize_relpath(str(item.get("path", "")))
        }
        delete_list = sorted(
            {
                normalize_relpath(str(item))
                for item in (payload.manifest.get("deleteList", []) or [])
                if normalize_relpath(str(item))
            }
        )
        payload.manifest["deleteList"] = delete_list
        delete_lists[scope] = delete_list
        file_counts[scope] = len(current_paths)
    return delete_lists, file_counts


def validate_release_payload(payloads: dict[str, PackagePayload], *, allow_up_override: bool = False) -> None:
    del payloads
    del allow_up_override


def _ensure_safe_launcher_publish(payloads: dict[str, PackagePayload], delete_lists: dict[str, list[str]]) -> None:
    launcher_payload = payloads.get("launcher")
    if launcher_payload is None:
        return
    launcher_files = launcher_payload.manifest.get("files", []) or []
    launcher_delete_list = delete_lists.get("launcher", [])
    if launcher_files or not launcher_delete_list:
        return
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="launcher 包仅包含删除项且不包含任何 launcher 文件，会生成危险的纯删除自升级包，已拒绝发布。请重新勾选真实 launcher 文件，或改为仅发布 game 包。",
    )


def _ensure_game_only_publish(payloads: dict[str, PackagePayload], delete_lists: dict[str, list[str]]) -> None:
    launcher_payload = payloads.get("launcher")
    if launcher_payload is None:
        return
    launcher_files = launcher_payload.manifest.get("files", []) or []
    launcher_delete_list = delete_lists.get("launcher", [])
    if launcher_files or launcher_delete_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前轻量更新链仅允许发布 game 内容。",
        )


def _persist_release_to_storage(
    settings: Settings,
    *,
    channel: str,
    release_id: str,
    notes: str,
    payloads: dict[str, PackagePayload],
    delete_lists: dict[str, list[str]],
    published_at: str,
) -> dict[str, Any]:
    release_root = settings.storage_updates_dir / channel / "releases" / release_id
    release_root.mkdir(parents=True, exist_ok=True)

    manifest_urls: dict[str, str] = {}
    package_urls: dict[str, str] = {}
    for scope, payload in payloads.items():
        scope_dir = release_scope_dir(settings, channel, release_id, scope)
        scope_dir.mkdir(parents=True, exist_ok=True)
        package_path = scope_dir / payload.package_file_name
        shutil.copy2(payload.package_temp_path, package_path)
        manifest_path = scope_dir / "release-manifest.json"
        _json_dump(manifest_path, payload.manifest)
        urls = package_public_urls(settings, channel, release_id, scope, payload.package_file_name)
        manifest_urls[scope] = urls["manifestUrl"]
        package_urls[scope] = urls["packageUrl"]

    release_notes_path(settings, channel, release_id).write_text(notes.strip() + "\n", encoding="utf-8")
    _json_dump(
        release_meta_path(settings, channel, release_id),
        {
            "channel": channel,
            "releaseId": release_id,
            "publishedAt": published_at,
            "notes": notes,
            "packages": {
                scope: {
                    "packageFileName": payload.package_file_name,
                    "packageSha256": payload.package_sha256,
                    "packageSize": payload.package_size,
                    "deleteCount": len(delete_lists[scope]),
                    "fileCount": len(payload.manifest.get("files", []) or []),
                }
                for scope, payload in payloads.items()
            },
        },
    )
    return {
        "manifestUrls": manifest_urls,
        "packageUrls": package_urls,
    }


def _write_latest_json(
    settings: Settings,
    *,
    channel: str,
    version: str,
    release_notes: str,
    required: bool,
    published_at: str,
    payloads: dict[str, PackagePayload],
    manifest_urls: dict[str, str],
    package_urls: dict[str, str],
) -> dict[str, Any]:
    game_payload = payloads["game"]
    announced_packages: dict[str, Any] = {
        "game": {
            "manifestUrl": manifest_urls["game"],
            "packageUrl": package_urls["game"],
            "packageSha256": game_payload.package_sha256,
            "packageSize": game_payload.package_size,
        }
    }
    if "launcher" in payloads and "launcher" in manifest_urls and "launcher" in package_urls:
        launcher_payload = payloads["launcher"]
        announced_packages["launcher"] = {
            "manifestUrl": manifest_urls["launcher"],
            "packageUrl": package_urls["launcher"],
            "packageSha256": launcher_payload.package_sha256,
            "packageSize": launcher_payload.package_size,
        }
    latest_payload = {
        "schemaVersion": 1,
        "channel": channel,
        "version": version,
        "releaseNotes": release_notes,
        "manifestUrl": manifest_urls["game"],
        "packageUrl": package_urls["game"],
        "packageSha256": game_payload.package_sha256,
        "packageSize": game_payload.package_size,
        "publishedAt": published_at,
        "required": required,
        "packages": announced_packages,
    }
    _json_dump(static_latest_path(settings, channel), latest_payload)
    return latest_payload


def _write_latest_json_from_db(settings: Settings, conn: sqlite3.Connection, channel: str, release_id: str) -> dict[str, Any]:
    release_row = _fetchone_dict(conn, "SELECT * FROM releases WHERE channel = ? AND release_id = ?", (channel, release_id))
    if not release_row:
        raise RuntimeError(f"未找到频道 {channel} 的发布 {release_id}")
    package_rows = _fetchall_dicts(conn, "SELECT * FROM release_packages WHERE release_id = ?", (release_row["id"],))
    package_by_scope = {row["scope"]: row for row in package_rows}
    if "game" not in package_by_scope:
        raise RuntimeError(f"频道 {channel} 的发布 {release_id} 缺少 game package")

    game_row = package_by_scope["game"]
    game_urls = package_public_urls(settings, channel, release_id, "game", game_row["package_file_name"])
    packages_payload: dict[str, Any] = {
        "game": {
            "manifestUrl": game_urls["manifestUrl"],
            "packageUrl": game_urls["packageUrl"],
            "packageSha256": game_row["package_sha256"],
            "packageSize": game_row["package_size"],
        }
    }
    if "launcher" in package_by_scope:
        launcher_row = package_by_scope["launcher"]
        launcher_urls = package_public_urls(settings, channel, release_id, "launcher", launcher_row["package_file_name"])
        packages_payload["launcher"] = {
            "manifestUrl": launcher_urls["manifestUrl"],
            "packageUrl": launcher_urls["packageUrl"],
            "packageSha256": launcher_row["package_sha256"],
            "packageSize": launcher_row["package_size"],
        }

    game_payload = packages_payload["game"]
    latest_payload = {
        "schemaVersion": 1,
        "channel": channel,
        "version": release_row["version"],
        "releaseNotes": release_row["notes"],
        "manifestUrl": game_payload["manifestUrl"],
        "packageUrl": game_payload["packageUrl"],
        "packageSha256": game_payload["packageSha256"],
        "packageSize": game_payload["packageSize"],
        "publishedAt": release_row["published_at"],
        "required": bool(release_row["required"]),
        "packages": packages_payload,
    }
    _json_dump(static_latest_path(settings, channel), latest_payload)
    return latest_payload


def _insert_release_db(
    conn: sqlite3.Connection,
    settings: Settings,
    *,
    channel: str,
    release_id: str,
    version: str,
    notes: str,
    required: bool,
    published_at: str,
    latest_payload: dict[str, Any],
    payloads: dict[str, PackagePayload],
) -> tuple[int, dict[str, int], dict[str, int]]:
    created_at = utc_now_iso()
    latest_json_path = str(static_latest_path(settings, channel))
    cursor = conn.execute(
        """
        INSERT INTO releases(channel, release_id, version, notes, required, published_at, latest_json_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (channel, release_id, version, notes, int(required), published_at, latest_json_path, created_at),
    )
    release_row_id = int(cursor.lastrowid)
    file_counts: dict[str, int] = {}
    delete_counts: dict[str, int] = {}

    for scope, payload in payloads.items():
        manifest_rel = str(PurePosixPath(channel) / "releases" / release_id / scope / "release-manifest.json")
        package_rel = str(PurePosixPath(channel) / "releases" / release_id / scope / payload.package_file_name)
        files = payload.manifest.get("files", []) or []
        delete_list = payload.manifest.get("deleteList", []) or []
        package_cursor = conn.execute(
            """
            INSERT INTO release_packages(
                release_id, scope, root_dir_name, package_file_name, package_sha256, package_size,
                manifest_path, package_path, file_count, delete_count, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                release_row_id,
                scope,
                str(payload.manifest.get("rootDirName", "")),
                payload.package_file_name,
                payload.package_sha256,
                payload.package_size,
                manifest_rel,
                package_rel,
                len(files),
                len(delete_list),
                created_at,
            ),
        )
        release_package_id = int(package_cursor.lastrowid)
        for item in files:
            conn.execute(
                """
                INSERT INTO release_files(release_package_id, path, size, sha256)
                VALUES (?, ?, ?, ?)
                """,
                (
                    release_package_id,
                    normalize_relpath(str(item.get("path", ""))),
                    int(item.get("size", 0) or 0),
                    str(item.get("sha256", "")),
                ),
            )
        file_counts[scope] = len(files)
        delete_counts[scope] = len(delete_list)

    conn.execute(
        """
        INSERT INTO channels(channel, current_release_id, current_version, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(channel) DO UPDATE SET
            current_release_id=excluded.current_release_id,
            current_version=excluded.current_version,
            updated_at=excluded.updated_at
        """,
        (channel, release_id, version, published_at),
    )
    return release_row_id, file_counts, delete_counts


def _get_release_row(conn: sqlite3.Connection, channel: str, release_id: str) -> dict[str, Any] | None:
    return _fetchone_dict(conn, "SELECT * FROM releases WHERE channel = ? AND release_id = ?", (channel, release_id))


def get_channel_current(conn: sqlite3.Connection, channel: str) -> dict[str, Any] | None:
    return _fetchone_dict(conn, "SELECT * FROM channels WHERE channel = ?", (channel,))


def ensure_latest_payload_current(settings: Settings, conn: sqlite3.Connection, channel: str) -> dict[str, Any]:
    current = get_channel_current(conn, channel)
    if current and str(current.get("current_release_id", "")).strip():
        return _write_latest_json_from_db(settings, conn, channel, str(current["current_release_id"]))
    latest_path = static_latest_path(settings, channel)
    if latest_path.exists():
        return _json_load(latest_path)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"频道 {channel} 尚无版本。")


def ensure_latest_json_file_current(settings: Settings, conn: sqlite3.Connection, channel: str) -> Path:
    ensure_latest_payload_current(settings, conn, channel)
    latest_path = static_latest_path(settings, channel)
    if not latest_path.exists() or not latest_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"频道 {channel} 尚无版本。")
    return latest_path


def get_history_total_count(conn: sqlite3.Connection, channel: str) -> int:
    row = conn.execute("SELECT COUNT(*) AS total FROM releases WHERE channel = ?", (channel,)).fetchone()
    return int(row["total"] or 0) if row else 0


def _build_history_entry(
    row: dict[str, Any],
) -> dict[str, Any]:
    launcher_download_count = int(row.get("launcher_download_count", 0) or 0)
    game_download_count = int(row.get("game_download_count", 0) or 0)
    last_download_candidates = [
        str(row.get("launcher_last_downloaded_at", "")).strip(),
        str(row.get("game_last_downloaded_at", "")).strip(),
    ]
    last_downloaded_at = max((value for value in last_download_candidates if value), default="")
    return {
        "releaseId": row["release_id"],
        "version": row["version"],
        "generatedAt": row["published_at"],
        "publishedAt": row["published_at"],
        "notes": row["notes"],
        "required": bool(row.get("required", 1)),
        "launcherFileCount": int(row["launcher_file_count"] or 0),
        "gameFileCount": int(row["game_file_count"] or 0),
        "launcherDeletedCount": int(row["launcher_delete_count"] or 0),
        "gameDeletedCount": int(row["game_delete_count"] or 0),
        "launcherPackageSize": int(row.get("launcher_package_size", 0) or 0),
        "gamePackageSize": int(row.get("game_package_size", 0) or 0),
        "launcherDownloadCount": launcher_download_count,
        "gameDownloadCount": game_download_count,
        "downloadCount": game_download_count,
        "totalDownloadCount": launcher_download_count + game_download_count,
        "lastDownloadedAt": last_downloaded_at,
    }


def get_history(conn: sqlite3.Connection, channel: str, limit: int) -> list[dict[str, Any]]:
    limit_value = int(limit)
    sql = """
        SELECT
            r.release_id,
            r.version,
            r.notes,
            r.required,
            r.published_at,
            MAX(CASE WHEN p.scope = 'launcher' THEN p.file_count ELSE 0 END) AS launcher_file_count,
            MAX(CASE WHEN p.scope = 'game' THEN p.file_count ELSE 0 END) AS game_file_count,
            MAX(CASE WHEN p.scope = 'launcher' THEN p.delete_count ELSE 0 END) AS launcher_delete_count,
            MAX(CASE WHEN p.scope = 'game' THEN p.delete_count ELSE 0 END) AS game_delete_count,
            MAX(CASE WHEN p.scope = 'launcher' THEN p.package_size ELSE 0 END) AS launcher_package_size,
            MAX(CASE WHEN p.scope = 'game' THEN p.package_size ELSE 0 END) AS game_package_size,
            MAX(CASE WHEN p.scope = 'launcher' THEN COALESCE(d.download_count, 0) ELSE 0 END) AS launcher_download_count,
            MAX(CASE WHEN p.scope = 'game' THEN COALESCE(d.download_count, 0) ELSE 0 END) AS game_download_count,
            MAX(CASE WHEN p.scope = 'launcher' THEN COALESCE(d.last_downloaded_at, '') ELSE '' END) AS launcher_last_downloaded_at,
            MAX(CASE WHEN p.scope = 'game' THEN COALESCE(d.last_downloaded_at, '') ELSE '' END) AS game_last_downloaded_at
        FROM releases r
        LEFT JOIN release_packages p ON p.release_id = r.id
        LEFT JOIN release_package_downloads d ON d.release_package_id = p.id
        WHERE r.channel = ?
        GROUP BY r.id
        ORDER BY r.published_at DESC, r.id DESC
    """
    params: tuple[Any, ...]
    if limit_value > 0:
        sql += "\nLIMIT ?"
        params = (channel, limit_value)
    else:
        params = (channel,)
    rows = _fetchall_dicts(conn, sql, params)
    return [_build_history_entry(row) for row in rows]


def delete_release(settings: Settings, *, channel: str, release_id: str) -> dict[str, Any]:
    release_storage_dir = settings.storage_updates_dir / channel / "releases" / release_id
    latest_path = static_latest_path(settings, channel)
    with db_session(settings.db_path) as conn:
        release_row = _get_release_row(conn, channel, release_id)
        if not release_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"频道 {channel} 不存在版本 {release_id}。")

        current_row = get_channel_current(conn, channel)
        was_current = bool(current_row and current_row.get("current_release_id") == release_id)

        if release_storage_dir.exists():
            shutil.rmtree(release_storage_dir)
        conn.execute("DELETE FROM releases WHERE id = ?", (release_row["id"],))

        next_release = _fetchone_dict(
            conn,
            """
            SELECT release_id, version, published_at
            FROM releases
            WHERE channel = ?
            ORDER BY published_at DESC, id DESC
            LIMIT 1
            """,
            (channel,),
        )

        if next_release:
            conn.execute(
                """
                INSERT INTO channels(channel, current_release_id, current_version, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(channel) DO UPDATE SET
                    current_release_id=excluded.current_release_id,
                    current_version=excluded.current_version,
                    updated_at=excluded.updated_at
                """,
                (
                    channel,
                    str(next_release["release_id"]),
                    str(next_release["version"]),
                    str(next_release["published_at"]),
                ),
            )
            _write_latest_json_from_db(settings, conn, channel, str(next_release["release_id"]))
        else:
            conn.execute("DELETE FROM channels WHERE channel = ?", (channel,))
            if latest_path.exists():
                latest_path.unlink()

    return {
        "channel": channel,
        "deletedReleaseId": release_id,
        "deletedVersion": str(release_row["version"]),
        "deletedWasCurrent": was_current,
        "currentReleaseId": str(next_release["release_id"]) if next_release else "",
        "currentVersion": str(next_release["version"]) if next_release else "",
        "latestUrl": latest_static_url(settings, channel) if next_release else "",
        "channelHasReleases": bool(next_release),
    }


def get_latest_payload(settings: Settings, conn: sqlite3.Connection, channel: str) -> dict[str, Any]:
    return ensure_latest_payload_current(settings, conn, channel)


def rebuild_channel_latest(settings: Settings, conn: sqlite3.Connection, channel: str) -> dict[str, Any]:
    payload = ensure_latest_payload_current(settings, conn, channel)
    current = get_channel_current(conn, channel) or {}
    return {
        "channel": channel,
        "currentReleaseId": str(current.get("current_release_id", "")),
        "currentVersion": str(current.get("current_version", "")),
        "latestUrl": latest_static_url(settings, channel),
        "payload": payload,
    }


def manifest_summary_payload(manifest: dict[str, Any], notes: str, published_at: str, required: bool, package_url: str) -> dict[str, Any]:
    return {
        "version": str(manifest.get("version", "")),
        "notes": notes,
        "download_url": package_url,
        "force_update": required,
        "file_size": int(manifest.get("packageSize", 0) or 0),
        "file_hash": str(manifest.get("packageSha256", "")),
        "created_at": published_at,
    }


def legacy_manifest_payload(settings: Settings, conn: sqlite3.Connection, channel: str) -> dict[str, Any]:
    latest = get_latest_payload(settings, conn, channel)
    game_package = latest.get("packages", {}).get("game", {})
    game_manifest_path = game_package.get("manifestUrl", "")
    notes = str(latest.get("releaseNotes", ""))
    published_at = str(latest.get("publishedAt", ""))
    required = bool(latest.get("required", True))
    payload = {
        "version": str(latest.get("version", "")),
        "notes": notes,
        "download_url": str(game_package.get("packageUrl", latest.get("packageUrl", ""))),
        "force_update": required,
        "file_size": int(game_package.get("packageSize", latest.get("packageSize", 0)) or 0),
        "file_hash": str(game_package.get("packageSha256", latest.get("packageSha256", ""))),
        "created_at": published_at,
        "manifest_url": game_manifest_path or str(latest.get("manifestUrl", "")),
    }
    return payload


def create_publish_event(conn: sqlite3.Connection, channel: str, version: str, remote_addr: str | None) -> int:
    cursor = conn.execute(
        """
        INSERT INTO publish_events(channel, version, status, started_at, remote_addr)
        VALUES (?, ?, ?, ?, ?)
        """,
        (channel, version, "processing", utc_now_iso(), remote_addr or ""),
    )
    return int(cursor.lastrowid)


def finish_publish_event(conn: sqlite3.Connection, event_id: int, status_value: str, error_message: str = "") -> None:
    conn.execute(
        """
        UPDATE publish_events
        SET status = ?, finished_at = ?, error_message = ?
        WHERE id = ?
        """,
        (status_value, utc_now_iso(), error_message, event_id),
    )


def publish_release(
    settings: Settings,
    *,
    channel: str,
    version: str,
    release_notes: str,
    required: bool,
    payloads: dict[str, PackagePayload],
    remote_addr: str | None,
) -> dict[str, Any]:
    release_id = safe_release_id(version)
    with db_session(settings.db_path) as conn:
        if _get_release_row(conn, channel, release_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"频道 {channel} 已存在版本 {release_id}。")
        event_id = create_publish_event(conn, channel, version, remote_addr)
        try:
            delete_lists, file_counts = _apply_delete_lists(conn, channel, payloads)
            validate_release_payload(payloads)
            _ensure_safe_launcher_publish(payloads, delete_lists)
            published_at = utc_now_iso()
            storage_refs = _persist_release_to_storage(
                settings,
                channel=channel,
                release_id=release_id,
                notes=release_notes,
                payloads=payloads,
                delete_lists=delete_lists,
                published_at=published_at,
            )
            latest_payload = _write_latest_json(
                settings,
                channel=channel,
                version=version,
                release_notes=release_notes,
                required=required,
                published_at=published_at,
                payloads=payloads,
                manifest_urls=storage_refs["manifestUrls"],
                package_urls=storage_refs["packageUrls"],
            )
            _insert_release_db(
                conn,
                settings,
                channel=channel,
                release_id=release_id,
                version=version,
                notes=release_notes,
                required=required,
                published_at=published_at,
                latest_payload=latest_payload,
                payloads=payloads,
            )
            finish_publish_event(conn, event_id, "succeeded")
        except Exception as exc:
            finish_publish_event(conn, event_id, "failed", str(exc))
            raise

    return {
        "version": version,
        "releaseId": release_id,
        "latestUrl": latest_static_url(settings, channel),
        "launcherFileCount": file_counts["launcher"],
        "gameFileCount": file_counts["game"],
        "launcherDeletedCount": len(delete_lists["launcher"]),
        "gameDeletedCount": len(delete_lists["game"]),
    }


def _clear_release_tables(conn: sqlite3.Connection) -> None:
    for table in ("channels", "release_files", "release_packages", "releases"):
        conn.execute(f"DELETE FROM {table}")


def _infer_release_id_from_latest(latest_payload: dict[str, Any]) -> str | None:
    candidates = [
        str(latest_payload.get("manifestUrl", "")),
        str(latest_payload.get("packageUrl", "")),
    ]
    for package_payload in (latest_payload.get("packages", {}) or {}).values():
        if isinstance(package_payload, dict):
            candidates.append(str(package_payload.get("manifestUrl", "")))
            candidates.append(str(package_payload.get("packageUrl", "")))
    for value in candidates:
        match = re.search(r"/releases/([^/]+)/", value)
        if match:
            return match.group(1)
    return None


def _scan_release_dir(settings: Settings, channel: str, release_dir: Path) -> tuple[str, dict[str, PackagePayload], str, bool, str]:
    release_id = release_dir.name
    notes_path = release_dir / "release-notes.txt"
    meta_path = release_dir / "release-meta.json"
    latest_path = static_latest_path(settings, channel)
    notes = notes_path.read_text(encoding="utf-8").strip() if notes_path.exists() else ""
    required = True
    published_at = utc_now_iso()
    if meta_path.exists():
        meta = _json_load(meta_path)
        published_at = str(meta.get("publishedAt") or meta.get("generatedAt") or published_at)
    payloads: dict[str, PackagePayload] = {}
    for scope in PACKAGE_SCOPES:
        manifest_path = release_dir / scope / "release-manifest.json"
        if not manifest_path.exists() and scope == "game":
            legacy_manifest_path = release_dir / "release-manifest.json"
            if legacy_manifest_path.exists():
                manifest_path = legacy_manifest_path
        if not manifest_path.exists():
            continue
        manifest_payload = _json_load(manifest_path)
        package_file_name = str(manifest_payload.get("packageFileName", "")).strip()
        package_path = manifest_path.parent / package_file_name
        if not package_path.exists() and scope == "game":
            package_path = release_dir / package_file_name
        payloads[scope] = PackagePayload(
            scope=scope,
            manifest=manifest_payload,
            manifest_bytes=manifest_path.read_bytes(),
            package_sha256=str(manifest_payload.get("packageSha256", "")),
            package_size=package_path.stat().st_size if package_path.exists() else int(manifest_payload.get("packageSize", 0) or 0),
            package_file_name=package_file_name,
            package_temp_path=package_path,
        )
    version = (
        str(payloads.get("game", payloads.get("launcher")).manifest.get("version", "")).strip()
        if payloads
        else release_id
    )
    if latest_path.exists():
        latest_payload = _json_load(latest_path)
        latest_release_id = _infer_release_id_from_latest(latest_payload)
        if latest_release_id == release_id:
            required = bool(latest_payload.get("required", True))
            notes = str(latest_payload.get("releaseNotes", notes))
            published_at = str(latest_payload.get("publishedAt", published_at))
    return version, payloads, notes, required, published_at


def rebuild_index_from_storage(settings: Settings) -> None:
    with db_session(settings.db_path) as conn:
        _clear_release_tables(conn)
        if not settings.storage_updates_dir.exists():
            return
        channels = sorted([item for item in settings.storage_updates_dir.iterdir() if item.is_dir()])
        for channel_dir in channels:
            releases_dir = channel_dir / "releases"
            if not releases_dir.exists():
                continue
            release_dirs = sorted([item for item in releases_dir.iterdir() if item.is_dir()], key=lambda item: item.name)
            current_release_id = _infer_release_id_from_latest(_json_load(channel_dir / "latest.json")) if (channel_dir / "latest.json").exists() else None
            latest_version = ""
            latest_published_at = utc_now_iso()
            for release_dir in release_dirs:
                version, payloads, notes, required, published_at = _scan_release_dir(settings, channel_dir.name, release_dir)
                if not payloads:
                    continue
                cursor = conn.execute(
                    """
                    INSERT INTO releases(channel, release_id, version, notes, required, published_at, latest_json_path, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        channel_dir.name,
                        release_dir.name,
                        version,
                        notes,
                        int(required),
                        published_at,
                        str(static_latest_path(settings, channel_dir.name)),
                        utc_now_iso(),
                    ),
                )
                release_row_id = int(cursor.lastrowid)
                for scope, payload in payloads.items():
                    files = payload.manifest.get("files", []) or []
                    delete_list = payload.manifest.get("deleteList", []) or []
                    package_path = release_scope_dir(settings, channel_dir.name, release_dir.name, scope) / payload.package_file_name
                    if not package_path.exists() and scope == "game":
                        package_path = releases_dir / release_dir.name / payload.package_file_name
                    package_rel = str(PurePosixPath(channel_dir.name) / "releases" / release_dir.name / scope / payload.package_file_name)
                    manifest_rel = str(PurePosixPath(channel_dir.name) / "releases" / release_dir.name / scope / "release-manifest.json")
                    package_cursor = conn.execute(
                        """
                        INSERT INTO release_packages(
                            release_id, scope, root_dir_name, package_file_name, package_sha256, package_size,
                            manifest_path, package_path, file_count, delete_count, created_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            release_row_id,
                            scope,
                            str(payload.manifest.get("rootDirName", ROOT_DIRS[scope])),
                            payload.package_file_name,
                            str(payload.manifest.get("packageSha256", "")),
                            package_path.stat().st_size if package_path.exists() else int(payload.manifest.get("packageSize", 0) or 0),
                            manifest_rel,
                            package_rel,
                            len(files),
                            len(delete_list),
                            utc_now_iso(),
                        ),
                    )
                    package_row_id = int(package_cursor.lastrowid)
                    for item in files:
                        conn.execute(
                            "INSERT INTO release_files(release_package_id, path, size, sha256) VALUES (?, ?, ?, ?)",
                            (
                                package_row_id,
                                normalize_relpath(str(item.get("path", ""))),
                                int(item.get("size", 0) or 0),
                                str(item.get("sha256", "")),
                            ),
                        )
                if release_dir.name == current_release_id or current_release_id is None:
                    latest_version = version
                    latest_published_at = published_at
                    current_release_id = release_dir.name
            if current_release_id:
                conn.execute(
                    """
                    INSERT INTO channels(channel, current_release_id, current_version, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(channel) DO UPDATE SET
                      current_release_id=excluded.current_release_id,
                      current_version=excluded.current_version,
                      updated_at=excluded.updated_at
                    """,
                    (channel_dir.name, current_release_id, latest_version or current_release_id, latest_published_at),
                )
        channel_rows = _fetchall_dicts(conn, "SELECT channel, current_release_id FROM channels", ())
        for row in channel_rows:
            _write_latest_json_from_db(settings, conn, str(row["channel"]), str(row["current_release_id"]))


def import_legacy_updates(settings: Settings, source_dir: Path | None = None) -> None:
    source = (source_dir or settings.legacy_updates_source).resolve()
    if not source.exists():
        raise FileNotFoundError(f"旧更新目录不存在: {source}")
    settings.storage_updates_dir.mkdir(parents=True, exist_ok=True)
    for item in source.iterdir():
        target = settings.storage_updates_dir / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        elif item.is_file():
            shutil.copy2(item, target)
    rebuild_index_from_storage(settings)
