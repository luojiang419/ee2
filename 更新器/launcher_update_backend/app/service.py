from __future__ import annotations

import base64
import hashlib
import json
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
import re

from fastapi import HTTPException, UploadFile, status

from .config import Settings
from .db import db_session

SUPPORTED_TARGET = "windows"
SUPPORTED_ARCH = "x86_64"
SEMVER_RE = re.compile(r"^v?(?P<major>\d+)\.(?P<minor>\d+)\.(?P<patch>\d+)$")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_semver(version: str) -> tuple[str, int, int, int]:
    match = SEMVER_RE.fullmatch(str(version).strip())
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="version 必须是 x.y.z 形式的 SemVer。",
        )
    major = int(match.group("major"))
    minor = int(match.group("minor"))
    patch = int(match.group("patch"))
    return f"{major}.{minor}.{patch}", major, minor, patch


def verify_publish_auth(settings: Settings, authorization_header: str | None) -> None:
    actual = (authorization_header or "").strip()
    if not actual.startswith("Basic "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少 Basic Authorization。",
        )
    try:
        decoded = base64.b64decode(actual.split(" ", 1)[1].strip()).decode("utf-8")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Basic Authorization 非法。",
        ) from exc
    if ":" not in decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Basic Authorization 非法。",
        )
    username, password = decoded.split(":", 1)
    if username != settings.admin_username or password != settings.admin_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号或密码无效。",
        )


async def write_upload(upload: UploadFile, target_path: Path) -> None:
    with target_path.open("wb") as handle:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def release_dir(settings: Settings, version: str) -> Path:
    return settings.releases_dir / version


def latest_json_path(settings: Settings) -> Path:
    return settings.storage_root / "latest.json"


def updater_package_path(settings: Settings, version: str) -> Path:
    return release_dir(settings, version) / "updater.nsis.zip"


def updater_signature_path(settings: Settings, version: str) -> Path:
    return release_dir(settings, version) / "updater.nsis.zip.sig"


def setup_exe_path(settings: Settings, version: str) -> Path:
    return release_dir(settings, version) / "setup.exe"


def release_notes_path(settings: Settings, version: str) -> Path:
    return release_dir(settings, version) / "release-notes.md"


def updater_package_url(settings: Settings, version: str) -> str:
    return f"{settings.static_base_url}/launcher-updates/releases/{version}/updater.nsis.zip"


def updater_signature_url(settings: Settings, version: str) -> str:
    return f"{settings.static_base_url}/launcher-updates/releases/{version}/updater.nsis.zip.sig"


def setup_exe_url(settings: Settings, version: str) -> str:
    return f"{settings.static_base_url}/launcher-updates/releases/{version}/setup.exe"


def latest_json_url(settings: Settings) -> str:
    return f"{settings.static_base_url}/launcher-updates/latest.json"


def _fetchone_dict(
    conn: sqlite3.Connection, sql: str, params: tuple[object, ...] = ()
) -> dict[str, object] | None:
    row = conn.execute(sql, params).fetchone()
    return dict(row) if row else None


def _fetchall_dicts(
    conn: sqlite3.Connection, sql: str, params: tuple[object, ...] = ()
) -> list[dict[str, object]]:
    return [dict(row) for row in conn.execute(sql, params).fetchall()]


def get_latest_release(conn: sqlite3.Connection) -> dict[str, object] | None:
    return _fetchone_dict(
        conn,
        """
        SELECT r.*, d.updater_download_count, d.setup_download_count, d.last_downloaded_at
        FROM releases r
        LEFT JOIN release_downloads d ON d.release_id = r.id
        ORDER BY r.major DESC, r.minor DESC, r.patch DESC, r.id DESC
        LIMIT 1
        """,
    )


def get_release(conn: sqlite3.Connection, version: str) -> dict[str, object] | None:
    normalized, _, _, _ = parse_semver(version)
    return _fetchone_dict(
        conn,
        """
        SELECT r.*, d.updater_download_count, d.setup_download_count, d.last_downloaded_at
        FROM releases r
        LEFT JOIN release_downloads d ON d.release_id = r.id
        WHERE r.version = ?
        """,
        (normalized,),
    )


def build_update_payload(settings: Settings, release: dict[str, object]) -> dict[str, object]:
    version = str(release["version"])
    return {
        "version": version,
        "notes": str(release["notes"]),
        "pub_date": str(release["published_at"]),
        "url": updater_package_url(settings, version),
        "signature": str(release["signature"]),
        "setupExeUrl": setup_exe_url(settings, version),
        "signatureUrl": updater_signature_url(settings, version),
        "sha256": str(release["updater_sha256"]),
        "size": int(release["updater_size"]),
        "target": str(release["target"]),
        "arch": str(release["arch"]),
    }


def write_latest_json(settings: Settings, release: dict[str, object] | None) -> dict[str, object] | None:
    latest_path = latest_json_path(settings)
    if release is None:
        if latest_path.exists():
            latest_path.unlink()
        return None
    payload = build_update_payload(settings, release)
    latest_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def get_latest_payload(settings: Settings, conn: sqlite3.Connection) -> dict[str, object]:
    latest = get_latest_release(conn)
    if not latest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="当前尚未发布任何启动器安装包。")
    payload = write_latest_json(settings, latest)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="当前尚未发布任何启动器安装包。")
    return payload


def check_for_update(
    settings: Settings,
    conn: sqlite3.Connection,
    *,
    target: str,
    arch: str,
    current_version: str,
) -> dict[str, object] | None:
    normalized_version, major, minor, patch = parse_semver(current_version)
    del normalized_version
    if target != SUPPORTED_TARGET or arch != SUPPORTED_ARCH:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"当前仅支持 {SUPPORTED_TARGET}/{SUPPORTED_ARCH} 安装包更新。",
        )
    latest = get_latest_release(conn)
    if not latest:
        return None
    latest_key = (int(latest["major"]), int(latest["minor"]), int(latest["patch"]))
    current_key = (major, minor, patch)
    if latest_key <= current_key:
        return None
    return build_update_payload(settings, latest)


def get_history_total_count(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT COUNT(*) AS total FROM releases").fetchone()
    return int(row["total"] or 0) if row else 0


def get_history(
    settings: Settings, conn: sqlite3.Connection, limit: int
) -> list[dict[str, object]]:
    sql = """
        SELECT r.*, d.updater_download_count, d.setup_download_count, d.last_downloaded_at
        FROM releases r
        LEFT JOIN release_downloads d ON d.release_id = r.id
        ORDER BY r.major DESC, r.minor DESC, r.patch DESC, r.id DESC
    """
    params: tuple[object, ...] = ()
    if int(limit) > 0:
        sql += "\nLIMIT ?"
        params = (int(limit),)
    rows = _fetchall_dicts(conn, sql, params)
    latest = get_latest_release(conn)
    latest_version = str(latest["version"]) if latest else ""
    return [
        {
            "version": str(row["version"]),
            "notes": str(row["notes"]),
            "target": str(row["target"]),
            "arch": str(row["arch"]),
            "publishedAt": str(row["published_at"]),
            "latest": str(row["version"]) == latest_version,
            "updaterSha256": str(row["updater_sha256"]),
            "updaterSize": int(row["updater_size"]),
            "setupSha256": str(row["setup_sha256"]),
            "setupSize": int(row["setup_size"]),
            "updaterPackageUrl": updater_package_url(settings, str(row["version"])),
            "setupExeUrl": setup_exe_url(settings, str(row["version"])),
            "updaterDownloadCount": int(row.get("updater_download_count", 0) or 0),
            "setupDownloadCount": int(row.get("setup_download_count", 0) or 0),
            "lastDownloadedAt": str(row.get("last_downloaded_at", "") or ""),
        }
        for row in rows
    ]


def _validate_publish_paths(setup_path: Path, updater_path: Path, signature_text: str) -> None:
    if setup_path.suffix.lower() != ".exe":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="setupExe 必须是 .exe 安装包。",
        )
    if not updater_path.name.lower().endswith(".nsis.zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="updaterPackage 必须是 .nsis.zip 文件。",
        )
    if not signature_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="updaterSignature 内容不能为空。",
        )


def publish_release(
    settings: Settings,
    *,
    version: str,
    notes: str,
    setup_path: Path,
    updater_path: Path,
    signature_text: str,
) -> dict[str, object]:
    normalized_version, major, minor, patch = parse_semver(version)
    _validate_publish_paths(setup_path, updater_path, signature_text)

    setup_sha256 = sha256_file(setup_path)
    updater_sha256 = sha256_file(updater_path)
    setup_size = setup_path.stat().st_size
    updater_size = updater_path.stat().st_size
    published_at = utc_now_iso()

    with db_session(settings.db_path) as conn:
        existing = get_release(conn, normalized_version)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"版本 {normalized_version} 已存在，禁止重复发布。",
            )

        latest = get_latest_release(conn)
        if latest:
            latest_key = (int(latest["major"]), int(latest["minor"]), int(latest["patch"]))
            next_key = (major, minor, patch)
            if next_key <= latest_key:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"新版本 {normalized_version} 必须大于当前 latest {latest['version']}。",
                )

        target_dir = release_dir(settings, normalized_version)
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(setup_path, setup_exe_path(settings, normalized_version))
        shutil.copy2(updater_path, updater_package_path(settings, normalized_version))
        updater_signature_path(settings, normalized_version).write_text(
            signature_text.strip(),
            encoding="utf-8",
        )
        release_notes_path(settings, normalized_version).write_text(notes.strip(), encoding="utf-8")

        cursor = conn.execute(
            """
            INSERT INTO releases(
                version, major, minor, patch, notes, target, arch,
                updater_sha256, updater_size, setup_sha256, setup_size,
                signature, published_at, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                normalized_version,
                major,
                minor,
                patch,
                notes.strip(),
                SUPPORTED_TARGET,
                SUPPORTED_ARCH,
                updater_sha256,
                int(updater_size),
                setup_sha256,
                int(setup_size),
                signature_text.strip(),
                published_at,
                published_at,
            ),
        )
        release_id = int(cursor.lastrowid)
        conn.execute(
            """
            INSERT INTO release_downloads(release_id, updater_download_count, setup_download_count, last_downloaded_at)
            VALUES (?, 0, 0, '')
            """,
            (release_id,),
        )

        release = get_release(conn, normalized_version)
        if not release:
            raise RuntimeError("发布成功后无法回读版本记录。")
        write_latest_json(settings, release)

    return {
        "version": normalized_version,
        "publishedAt": published_at,
        "latestUrl": latest_json_url(settings),
        "checkUrl": f"{settings.static_base_url}/api/launcher-update/v1/check/{SUPPORTED_TARGET}/{SUPPORTED_ARCH}/{normalized_version}",
        "updaterPackageUrl": updater_package_url(settings, normalized_version),
        "setupExeUrl": setup_exe_url(settings, normalized_version),
    }


def increment_download(conn: sqlite3.Connection, release_id: int, kind: str) -> None:
    if kind not in {"updater", "setup"}:
        raise ValueError(f"unsupported download kind: {kind}")
    now = utc_now_iso()
    updater_increment = 1 if kind == "updater" else 0
    setup_increment = 1 if kind == "setup" else 0
    conn.execute(
        """
        INSERT INTO release_downloads(release_id, updater_download_count, setup_download_count, last_downloaded_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(release_id) DO UPDATE SET
            updater_download_count = release_downloads.updater_download_count + excluded.updater_download_count,
            setup_download_count = release_downloads.setup_download_count + excluded.setup_download_count,
            last_downloaded_at = excluded.last_downloaded_at
        """,
        (release_id, updater_increment, setup_increment, now),
    )


def resolve_release_file(
    settings: Settings,
    conn: sqlite3.Connection,
    *,
    version: str,
    kind: str,
) -> tuple[Path, dict[str, object]]:
    release = get_release(conn, version)
    if not release:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"版本 {version} 不存在。",
        )
    normalized_version = str(release["version"])
    if kind == "setup":
        file_path = setup_exe_path(settings, normalized_version)
    elif kind == "updater":
        file_path = updater_package_path(settings, normalized_version)
    elif kind == "signature":
        file_path = updater_signature_path(settings, normalized_version)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="不支持的文件类型。",
        )
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"版本 {normalized_version} 的文件不存在。",
        )
    return file_path, release


def delete_release(settings: Settings, *, version: str) -> dict[str, object]:
    normalized_version, _, _, _ = parse_semver(version)
    deleted_latest = False
    next_latest_version = ""
    with db_session(settings.db_path) as conn:
        release = get_release(conn, normalized_version)
        if not release:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"版本 {normalized_version} 不存在。",
            )
        latest = get_latest_release(conn)
        deleted_latest = bool(latest and str(latest["version"]) == normalized_version)
        conn.execute("DELETE FROM releases WHERE id = ?", (int(release["id"]),))
        shutil.rmtree(release_dir(settings, normalized_version), ignore_errors=True)
        next_latest = get_latest_release(conn)
        if next_latest:
            write_latest_json(settings, next_latest)
            next_latest_version = str(next_latest["version"])
        else:
            write_latest_json(settings, None)
    return {
        "deletedVersion": normalized_version,
        "deletedLatest": deleted_latest,
        "nextLatestVersion": next_latest_version,
        "latestUrl": latest_json_url(settings),
    }
