from __future__ import annotations

import base64
import json
import shutil
import sqlite3
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

from fastapi import HTTPException, UploadFile, status

from .config import Settings

BUNDLE_FORMAT = "ee2x-v2-release-bundle"
BUNDLE_VERSION = 1


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_relpath(value: str) -> str:
    cleaned = str(value or "").replace("\\", "/").strip().strip("/")
    while "//" in cleaned:
        cleaned = cleaned.replace("//", "/")
    return cleaned


def safe_release_id(version: str) -> str:
    return normalize_relpath(version.replace(" ", "_")) or "release"


def static_manifest_path(settings: Settings, channel: str) -> Path:
    return settings.storage_updates_dir / "v2" / channel / "manifest.json"


def release_dir(settings: Settings, channel: str, release_id: str) -> Path:
    return settings.storage_updates_dir / "v2" / channel / "releases" / release_id


def _json_dump(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _json_load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _fetchone_dict(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    row = conn.execute(sql, params).fetchone()
    return dict(row) if row else None


def _fetchall_dicts(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in conn.execute(sql, params).fetchall()]


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


def _safe_extract_zip(bundle_path: Path, extract_dir: Path) -> None:
    with zipfile.ZipFile(bundle_path) as archive:
        for member in archive.infolist():
            candidate = (extract_dir / member.filename).resolve()
            if not str(candidate).startswith(str(extract_dir.resolve())):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bundle ZIP 含非法路径。")
        archive.extractall(extract_dir)


def _build_manifest_payload(
    settings: Settings,
    *,
    channel: str,
    release_id: str,
    version: str,
    notes: str,
    required: bool,
    published_at: str,
    runtime_manifest: dict[str, Any],
    content_manifest: dict[str, Any],
    cleanup_manifest: dict[str, Any],
) -> dict[str, Any]:
    base = settings.static_base_url.rstrip("/")
    runtime_package_name = str(runtime_manifest.get("packageFileName", "")).strip()
    full = dict(content_manifest.get("full", {}) or {})
    delta = dict(content_manifest.get("delta", {}) or {})
    payload = {
        "schemaVersion": 2,
        "channel": channel,
        "releaseId": release_id,
        "version": version,
        "publishedAt": published_at,
        "required": required,
        "releaseNotes": notes,
        "launcher": {
            "feedUrl": f"{base}/updates/v2/launcher/{channel}/{release_id}/feed",
        },
        "runtime": {
            "manifestUrl": f"{base}/updates/v2/runtime/{channel}/{release_id}/runtime-manifest.json",
            "packageUrl": f"{base}/updates/v2/runtime/{channel}/{release_id}/{runtime_package_name}",
            "packageSha256": str(runtime_manifest.get("packageSha256", "")),
            "packageSize": int(runtime_manifest.get("packageSize", 0) or 0),
            "fileHashes": list(runtime_manifest.get("files", []) or []),
        },
        "content": {
            "deltaFrom": str(content_manifest.get("deltaFrom", "")),
            "deltaUrl": f"{base}/updates/v2/content/{channel}/{release_id}/{delta.get('fileName', '')}" if delta.get("fileName") else "",
            "deltaSignatureUrl": f"{base}/updates/v2/content/{channel}/{release_id}/{delta.get('signatureFileName', '')}" if delta.get("signatureFileName") else "",
            "fullUrl": f"{base}/updates/v2/content/{channel}/{release_id}/{full.get('fileName', '')}",
            "fullSignatureUrl": f"{base}/updates/v2/content/{channel}/{release_id}/{full.get('signatureFileName', '')}",
        },
        "cleanup": {
            "legacyPaths": list(cleanup_manifest.get("legacyPaths", []) or []),
        },
    }
    return payload


def _insert_or_replace_release(
    settings: Settings,
    conn: sqlite3.Connection,
    *,
    channel: str,
    release_id: str,
    version: str,
    notes: str,
    required: bool,
    published_at: str,
    manifest_relpath: str,
    launcher_feed_relpath: str,
    launcher_metadata_relpath: str,
    runtime_manifest: dict[str, Any],
    runtime_manifest_relpath: str,
    runtime_package_relpath: str,
    content_manifest: dict[str, Any],
    content_manifest_relpath: str,
    cleanup_manifest: dict[str, Any],
) -> None:
    now = utc_now_iso()
    conn.execute(
        """
        INSERT INTO releases(channel, release_id, version, notes, required, published_at, manifest_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(channel, release_id) DO UPDATE SET
            version=excluded.version,
            notes=excluded.notes,
            required=excluded.required,
            published_at=excluded.published_at,
            manifest_path=excluded.manifest_path
        """,
        (channel, release_id, version, notes, 1 if required else 0, published_at, manifest_relpath, now),
    )
    release_row = _fetchone_dict(
        conn,
        "SELECT id FROM releases WHERE channel = ? AND release_id = ?",
        (channel, release_id),
    )
    if not release_row:
        raise RuntimeError("写入 release 记录失败。")
    release_db_id = int(release_row["id"])

    conn.execute("DELETE FROM release_launcher_assets WHERE release_id = ?", (release_db_id,))
    conn.execute(
        """
        INSERT INTO release_launcher_assets(release_id, feed_path, metadata_path, package_id, channel_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (release_db_id, launcher_feed_relpath, launcher_metadata_relpath, "com.ee2x.launcher", channel, now),
    )

    conn.execute("DELETE FROM release_runtime_assets WHERE release_id = ?", (release_db_id,))
    conn.execute(
        """
        INSERT INTO release_runtime_assets(release_id, manifest_path, package_path, package_sha256, package_size, file_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            release_db_id,
            runtime_manifest_relpath,
            runtime_package_relpath,
            str(runtime_manifest.get("packageSha256", "")),
            int(runtime_manifest.get("packageSize", 0) or 0),
            len(runtime_manifest.get("files", []) or []),
            now,
        ),
    )

    full = dict(content_manifest.get("full", {}) or {})
    delta = dict(content_manifest.get("delta", {}) or {})
    conn.execute("DELETE FROM release_content_assets WHERE release_id = ?", (release_db_id,))
    conn.execute(
        """
        INSERT INTO release_content_assets(
            release_id, manifest_path, delta_from_release_id, delta_package_path, delta_signature_path,
            full_package_path, full_signature_path, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            release_db_id,
            content_manifest_relpath,
            str(content_manifest.get("deltaFrom", "")),
            str(PurePosixPath(content_manifest_relpath).parent / delta.get("fileName", "")) if delta.get("fileName") else "",
            str(PurePosixPath(content_manifest_relpath).parent / delta.get("signatureFileName", "")) if delta.get("signatureFileName") else "",
            str(PurePosixPath(content_manifest_relpath).parent / full.get("fileName", "")),
            str(PurePosixPath(content_manifest_relpath).parent / full.get("signatureFileName", "")),
            now,
        ),
    )

    conn.execute("DELETE FROM release_cleanup_rules WHERE release_id = ?", (release_db_id,))
    for item in cleanup_manifest.get("legacyPaths", []) or []:
        conn.execute(
            "INSERT INTO release_cleanup_rules(release_id, path) VALUES (?, ?)",
            (release_db_id, normalize_relpath(str(item))),
        )


def _set_channel_current(conn: sqlite3.Connection, *, channel: str, release_id: str, version: str) -> None:
    now = utc_now_iso()
    conn.execute(
        """
        INSERT INTO channels(channel, current_release_id, current_version, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(channel) DO UPDATE SET
            current_release_id=excluded.current_release_id,
            current_version=excluded.current_version,
            updated_at=excluded.updated_at
        """,
        (channel, release_id, version, now),
    )


async def save_uploaded_bundle(temp_root: Path, bundle_file: UploadFile) -> Path:
    temp_root.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(tempfile.mkdtemp(prefix="publish-v2-", dir=str(temp_root)))
    bundle_path = temp_dir / (Path(bundle_file.filename or "bundle.zip").name or "bundle.zip")
    with bundle_path.open("wb") as handle:
        while True:
            chunk = await bundle_file.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)
    return bundle_path


def publish_release_bundle(
    settings: Settings,
    conn: sqlite3.Connection,
    *,
    channel: str,
    bundle_path: Path,
    remote_addr: str = "",
) -> dict[str, Any]:
    temp_dir = bundle_path.parent / "extract"
    temp_dir.mkdir(parents=True, exist_ok=True)
    _safe_extract_zip(bundle_path, temp_dir)

    bundle_meta_path = temp_dir / "bundle-meta.json"
    notes_path = temp_dir / "release-notes.txt"
    runtime_manifest_path = temp_dir / "runtime" / "runtime-manifest.json"
    content_manifest_path = temp_dir / "content" / "content-manifest.json"
    cleanup_manifest_path = temp_dir / "cleanup" / "legacy-paths.json"

    required_files = [
        bundle_meta_path,
        notes_path,
        runtime_manifest_path,
        content_manifest_path,
        cleanup_manifest_path,
    ]
    for file_path in required_files:
        if not file_path.exists():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"bundle ZIP 缺少必需文件: {file_path.relative_to(temp_dir)}")

    meta = _json_load(bundle_meta_path)
    if str(meta.get("bundleFormat", "")).strip() != BUNDLE_FORMAT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bundle-meta.json.bundleFormat 非法。")
    if int(meta.get("bundleVersion", 0) or 0) != BUNDLE_VERSION:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bundle-meta.json.bundleVersion 非法。")

    release_id = safe_release_id(str(meta.get("releaseId") or meta.get("version") or ""))
    version = str(meta.get("version", "")).strip()
    if not version:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bundle-meta.json.version 不能为空。")
    notes = notes_path.read_text(encoding="utf-8").strip()
    required = bool(meta.get("required", True))
    published_at = utc_now_iso()

    launcher_feed_dir = temp_dir / "launcher" / "feed"
    launcher_channel = str(meta.get("launcher", {}).get("channel", channel)).strip() or channel
    launcher_feed_file = launcher_feed_dir / f"releases.{launcher_channel}.json"
    launcher_metadata_path = launcher_feed_dir / "launcher-feed.json"
    if not launcher_feed_file.exists() or not launcher_metadata_path.exists():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="launcher feed 目录不完整。")

    runtime_manifest = _json_load(runtime_manifest_path)
    runtime_package_name = str(runtime_manifest.get("packageFileName", "")).strip()
    runtime_package_path = temp_dir / "runtime" / runtime_package_name
    if not runtime_package_name or not runtime_package_path.exists():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="runtime 包文件不存在。")

    content_manifest = _json_load(content_manifest_path)
    full = dict(content_manifest.get("full", {}) or {})
    delta = dict(content_manifest.get("delta", {}) or {})
    full_path = temp_dir / "content" / str(full.get("fileName", "")).strip()
    full_sig_path = temp_dir / "content" / str(full.get("signatureFileName", "")).strip()
    if not full_path.exists() or not full_sig_path.exists():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="content full 包或签名不存在。")
    if delta:
        delta_path = temp_dir / "content" / str(delta.get("fileName", "")).strip()
        delta_sig_path = temp_dir / "content" / str(delta.get("signatureFileName", "")).strip()
        if not delta_path.exists() or not delta_sig_path.exists():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="content delta 包或签名不存在。")
        current_row = _fetchone_dict(conn, "SELECT current_release_id FROM channels WHERE channel = ?", (channel,))
        current_release_id = str((current_row or {}).get("current_release_id", "")).strip()
        delta_from = str(content_manifest.get("deltaFrom", "")).strip()
        if current_release_id and delta_from != current_release_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"content deltaFrom 必须指向当前 latest ({current_release_id})。",
            )

    cleanup_manifest = _json_load(cleanup_manifest_path)
    allowed_cleanup = {
        "update/ee2x-patcher.exe",
        "update/ee2x-patcher-cli.exe",
        "update/runtime",
        "temp_update",
    }
    invalid_cleanup = [
        normalize_relpath(str(item))
        for item in cleanup_manifest.get("legacyPaths", []) or []
        if normalize_relpath(str(item)) not in allowed_cleanup
    ]
    if invalid_cleanup:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cleanup manifest 含非白名单旧路径。")

    destination = release_dir(settings, channel, release_id)
    if destination.exists():
        shutil.rmtree(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(temp_dir, destination)

    aggregate_manifest = _build_manifest_payload(
        settings,
        channel=channel,
        release_id=release_id,
        version=version,
        notes=notes,
        required=required,
        published_at=published_at,
        runtime_manifest=runtime_manifest,
        content_manifest=content_manifest,
        cleanup_manifest=cleanup_manifest,
    )
    manifest_path = destination / "manifest.json"
    _json_dump(manifest_path, aggregate_manifest)
    shutil.copy2(manifest_path, static_manifest_path(settings, channel))

    release_root = PurePosixPath("v2") / channel / "releases" / release_id
    _insert_or_replace_release(
        settings,
        conn,
        channel=channel,
        release_id=release_id,
        version=version,
        notes=notes,
        required=required,
        published_at=published_at,
        manifest_relpath=str(release_root / "manifest.json"),
        launcher_feed_relpath=str(release_root / "launcher" / "feed"),
        launcher_metadata_relpath=str(release_root / "launcher" / "feed" / "launcher-feed.json"),
        runtime_manifest=runtime_manifest,
        runtime_manifest_relpath=str(release_root / "runtime" / "runtime-manifest.json"),
        runtime_package_relpath=str(release_root / "runtime" / runtime_package_name),
        content_manifest=content_manifest,
        content_manifest_relpath=str(release_root / "content" / "content-manifest.json"),
        cleanup_manifest=cleanup_manifest,
    )
    _set_channel_current(conn, channel=channel, release_id=release_id, version=version)

    conn.execute(
        """
        INSERT INTO publish_events(channel, version, status, started_at, finished_at, remote_addr, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (channel, version, "published", published_at, utc_now_iso(), remote_addr, ""),
    )
    return {
        "channel": channel,
        "releaseId": release_id,
        "version": version,
        "manifestUrl": f"{settings.static_base_url.rstrip('/')}/api/update/v2/channels/{channel}/manifest",
    }


def get_latest_payload(settings: Settings, conn: sqlite3.Connection, channel: str) -> dict[str, Any]:
    row = _fetchone_dict(conn, "SELECT current_release_id FROM channels WHERE channel = ?", (channel,))
    if not row or not row.get("current_release_id"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"频道 {channel} 尚无 v2 版本。")
    manifest_file = static_manifest_path(settings, channel)
    if not manifest_file.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"频道 {channel} manifest 文件不存在。")
    return _json_load(manifest_file)


def get_history(conn: sqlite3.Connection, channel: str) -> dict[str, Any]:
    current = _fetchone_dict(conn, "SELECT current_release_id, current_version FROM channels WHERE channel = ?", (channel,)) or {}
    history = _fetchall_dicts(
        conn,
        """
        SELECT release_id, version, notes, required, published_at, created_at
        FROM releases
        WHERE channel = ?
        ORDER BY created_at DESC, id DESC
        """,
        (channel,),
    )
    current_release_id = str(current.get("current_release_id", ""))
    for item in history:
        item["isCurrent"] = str(item.get("release_id", "")) == current_release_id
    return {
        "ok": True,
        "channel": channel,
        "currentReleaseId": current_release_id,
        "currentVersion": str(current.get("current_version", "")),
        "history": history,
    }


def promote_release(settings: Settings, conn: sqlite3.Connection, *, channel: str, release_id: str) -> dict[str, Any]:
    row = _fetchone_dict(
        conn,
        "SELECT version, manifest_path FROM releases WHERE channel = ? AND release_id = ?",
        (channel, release_id),
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"频道 {channel} 不存在 release {release_id}。")
    manifest_file = settings.storage_updates_dir / Path(str(row["manifest_path"]))
    if not manifest_file.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"release {release_id} manifest 文件不存在。")
    shutil.copy2(manifest_file, static_manifest_path(settings, channel))
    _set_channel_current(conn, channel=channel, release_id=release_id, version=str(row["version"]))
    return {"channel": channel, "releaseId": release_id, "version": str(row["version"])}


def rollback_release(settings: Settings, conn: sqlite3.Connection, *, channel: str, release_id: str) -> dict[str, Any]:
    return promote_release(settings, conn, channel=channel, release_id=release_id)


def resolve_launcher_asset(settings: Settings, conn: sqlite3.Connection, *, channel: str, release_id: str, asset_path: str) -> tuple[Path, int]:
    row = _fetchone_dict(
        conn,
        "SELECT id FROM releases WHERE channel = ? AND release_id = ?",
        (channel, release_id),
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="launcher release 不存在。")
    release_db_id = int(row["id"])
    file_path = release_dir(settings, channel, release_id) / "launcher" / normalize_relpath(asset_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="launcher 资产不存在。")
    return file_path, release_db_id


def resolve_runtime_asset(settings: Settings, conn: sqlite3.Connection, *, channel: str, release_id: str, file_name: str) -> tuple[Path, int]:
    row = _fetchone_dict(conn, "SELECT id FROM releases WHERE channel = ? AND release_id = ?", (channel, release_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="runtime release 不存在。")
    release_db_id = int(row["id"])
    file_path = release_dir(settings, channel, release_id) / "runtime" / Path(file_name).name
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="runtime 资产不存在。")
    return file_path, release_db_id


def resolve_content_asset(settings: Settings, conn: sqlite3.Connection, *, channel: str, release_id: str, file_name: str) -> tuple[Path, int]:
    row = _fetchone_dict(conn, "SELECT id FROM releases WHERE channel = ? AND release_id = ?", (channel, release_id))
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="content release 不存在。")
    release_db_id = int(row["id"])
    file_path = release_dir(settings, channel, release_id) / "content" / Path(file_name).name
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="content 资产不存在。")
    return file_path, release_db_id


def increment_download(conn: sqlite3.Connection, *, release_db_id: int, asset_type: str, asset_path: str) -> None:
    now = utc_now_iso()
    conn.execute(
        """
        INSERT INTO downloads(release_id, asset_type, asset_path, download_count, last_downloaded_at)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(release_id, asset_type, asset_path) DO UPDATE SET
            download_count = downloads.download_count + 1,
            last_downloaded_at = excluded.last_downloaded_at
        """,
        (release_db_id, asset_type, asset_path, now),
    )
