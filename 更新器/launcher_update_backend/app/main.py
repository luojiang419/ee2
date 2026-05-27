from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response

from .config import load_settings
from .db import db_session, init_db
from .service import (
    check_for_update,
    delete_release,
    get_history,
    get_history_total_count,
    get_latest_payload,
    get_latest_release,
    increment_download,
    publish_release,
    resolve_release_file,
    verify_publish_auth,
    write_upload,
)


settings = load_settings()
init_db(settings.db_path)

app = FastAPI(title="EE2X Launcher Installer Update", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/launcher-update/v1/health")
def health() -> dict[str, object]:
    with db_session(settings.db_path) as conn:
        release_count = conn.execute("SELECT COUNT(*) AS total FROM releases").fetchone()["total"]
        latest = get_latest_release(conn)
    return {
        "ok": True,
        "service": "ee2x-launcher-update",
        "version": "1.0.0",
        "storageRoot": str(settings.storage_root),
        "dbPath": str(settings.db_path),
        "releaseCount": int(release_count or 0),
        "currentLatestVersion": str(latest["version"]) if latest else "",
    }


@app.get("/api/launcher-update/v1/check/{target}/{arch}/{current_version}")
def check_update(target: str, arch: str, current_version: str):
    with db_session(settings.db_path) as conn:
        payload = check_for_update(
            settings,
            conn,
            target=target,
            arch=arch,
            current_version=current_version,
        )
    if payload is None:
        return Response(status_code=204)
    return JSONResponse(payload)


@app.get("/api/launcher-update/v1/history")
def history(limit: int = 0) -> dict[str, object]:
    with db_session(settings.db_path) as conn:
        latest = get_latest_release(conn)
        items = get_history(settings, conn, limit)
        total = get_history_total_count(conn)
    return {
        "ok": True,
        "currentVersion": str(latest["version"]) if latest else "",
        "historyTotalCount": total,
        "returnedCount": len(items),
        "history": items,
    }


@app.post("/api/launcher-update/v1/releases/publish")
async def publish(
    version: str = Form(...),
    notes: str = Form(""),
    setupExe: UploadFile = File(...),
    updaterPackage: UploadFile = File(...),
    updaterSignature: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    verify_publish_auth(settings, authorization)
    temp_dir = Path(tempfile.mkdtemp(prefix="launcher-update-", dir=str(settings.tmp_dir)))
    try:
        setup_path = temp_dir / (Path(setupExe.filename or "setup.exe").name or "setup.exe")
        updater_path = temp_dir / (
            Path(updaterPackage.filename or "updater.nsis.zip").name or "updater.nsis.zip"
        )
        signature_path = temp_dir / (
            Path(updaterSignature.filename or "updater.nsis.zip.sig").name
            or "updater.nsis.zip.sig"
        )
        await write_upload(setupExe, setup_path)
        await write_upload(updaterPackage, updater_path)
        await write_upload(updaterSignature, signature_path)
        result = publish_release(
            settings,
            version=version,
            notes=notes,
            setup_path=setup_path,
            updater_path=updater_path,
            signature_text=signature_path.read_text(encoding="utf-8"),
        )
        return {"ok": True, **result}
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.delete("/api/launcher-update/v1/releases/{version}")
def remove_release(version: str, authorization: str | None = Header(default=None)):
    verify_publish_auth(settings, authorization)
    result = delete_release(settings, version=version)
    return {"ok": True, **result}


@app.get("/launcher-updates/latest.json")
def latest_json():
    with db_session(settings.db_path) as conn:
        payload = get_latest_payload(settings, conn)
    return JSONResponse(payload)


@app.get("/launcher-updates/releases/{version}/setup.exe")
def download_setup(version: str):
    with db_session(settings.db_path) as conn:
        file_path, release = resolve_release_file(settings, conn, version=version, kind="setup")
        increment_download(conn, int(release["id"]), "setup")
    return FileResponse(file_path, media_type="application/vnd.microsoft.portable-executable")


@app.get("/launcher-updates/releases/{version}/updater.nsis.zip")
def download_updater(version: str):
    with db_session(settings.db_path) as conn:
        file_path, release = resolve_release_file(settings, conn, version=version, kind="updater")
        increment_download(conn, int(release["id"]), "updater")
    return FileResponse(file_path, media_type="application/zip")


@app.get("/launcher-updates/releases/{version}/updater.nsis.zip.sig")
def download_updater_signature(version: str):
    with db_session(settings.db_path) as conn:
        file_path, _release = resolve_release_file(settings, conn, version=version, kind="signature")
    return FileResponse(file_path, media_type="text/plain; charset=utf-8")
