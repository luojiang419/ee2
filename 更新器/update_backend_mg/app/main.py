from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import FastAPI, File, Form, Header, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from .config import load_settings
from .db import db_session, init_db
from .service import (
    get_history,
    get_latest_payload,
    increment_download,
    promote_release,
    publish_release_bundle,
    resolve_content_asset,
    resolve_launcher_asset,
    resolve_runtime_asset,
    rollback_release,
    save_uploaded_bundle,
    verify_publish_auth,
    verify_publish_username_password,
)

settings = load_settings()
init_db(settings.db_path)

app = FastAPI(title="EE2X Update MG v2", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/update/v1/health")
@app.get("/api/update/v2/health")
def health() -> dict:
    with db_session(settings.db_path) as conn:
        channel_count = conn.execute("SELECT COUNT(*) FROM channels").fetchone()[0]
        release_count = conn.execute("SELECT COUNT(*) FROM releases").fetchone()[0]
    return {
        "ok": True,
        "service": "ee2x-update-mg-v2",
        "version": "2.0.0",
        "storageUpdatesDir": str(settings.storage_updates_dir),
        "dbPath": str(settings.db_path),
        "channelCount": int(channel_count),
        "releaseCount": int(release_count),
    }


@app.post("/api/update/v1/auth/login")
@app.post("/api/update/v2/auth/login")
def login(
    username: str = Form(...),
    password: str = Form(...),
):
    verify_publish_username_password(settings, username.strip(), password)
    return {"ok": True, "username": settings.admin_username, "channel": settings.default_channel}


@app.get("/api/update/v2/channels/{channel}/manifest")
def latest(channel: str):
    with db_session(settings.db_path) as conn:
        payload = get_latest_payload(settings, conn, channel)
    return JSONResponse(payload)


@app.get("/api/update/v2/channels/{channel}/history")
def history(channel: str):
    with db_session(settings.db_path) as conn:
        payload = get_history(conn, channel)
    return JSONResponse(payload)


@app.post("/api/update/v2/releases/publish-bundle")
async def publish_bundle(
    request: Request,
    channel: str = Form(default=settings.default_channel),
    bundleFile: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    verify_publish_auth(settings, authorization)
    bundle_path = await save_uploaded_bundle(settings.storage_tmp_dir, bundleFile)
    try:
        with db_session(settings.db_path) as conn:
            result = publish_release_bundle(
                settings,
                conn,
                channel=channel.strip() or settings.default_channel,
                bundle_path=bundle_path,
                remote_addr=request.client.host if request.client else "",
            )
        return {"ok": True, **result}
    finally:
        shutil.rmtree(bundle_path.parent, ignore_errors=True)


@app.post("/api/update/v2/channels/{channel}/promote/{release_id}")
def promote(
    channel: str,
    release_id: str,
    authorization: str | None = Header(default=None),
):
    verify_publish_auth(settings, authorization)
    with db_session(settings.db_path) as conn:
        result = promote_release(settings, conn, channel=channel, release_id=release_id)
    return {"ok": True, **result}


@app.post("/api/update/v2/channels/{channel}/rollback/{release_id}")
def rollback(
    channel: str,
    release_id: str,
    authorization: str | None = Header(default=None),
):
    verify_publish_auth(settings, authorization)
    with db_session(settings.db_path) as conn:
        result = rollback_release(settings, conn, channel=channel, release_id=release_id)
    return {"ok": True, **result}


@app.get("/updates/v2/launcher/{channel}/{release_id}/{asset_path:path}")
def launcher_asset(channel: str, release_id: str, asset_path: str):
    with db_session(settings.db_path) as conn:
        file_path, release_db_id = resolve_launcher_asset(
            settings,
            conn,
            channel=channel,
            release_id=release_id,
            asset_path=asset_path,
        )
        increment_download(conn, release_db_id=release_db_id, asset_type="launcher", asset_path=asset_path)
    media_type = "application/json" if file_path.suffix.lower() == ".json" else "application/octet-stream"
    return FileResponse(file_path, media_type=media_type)


@app.get("/updates/v2/runtime/{channel}/{release_id}/{file_name}")
def runtime_asset(channel: str, release_id: str, file_name: str):
    with db_session(settings.db_path) as conn:
        file_path, release_db_id = resolve_runtime_asset(
            settings,
            conn,
            channel=channel,
            release_id=release_id,
            file_name=file_name,
        )
        increment_download(conn, release_db_id=release_db_id, asset_type="runtime", asset_path=file_name)
    media_type = "application/json" if file_path.suffix.lower() == ".json" else "application/zip"
    return FileResponse(file_path, media_type=media_type, filename=file_path.name)


@app.get("/updates/v2/content/{channel}/{release_id}/{file_name}")
def content_asset(channel: str, release_id: str, file_name: str):
    with db_session(settings.db_path) as conn:
        file_path, release_db_id = resolve_content_asset(
            settings,
            conn,
            channel=channel,
            release_id=release_id,
            file_name=file_name,
        )
        increment_download(conn, release_db_id=release_db_id, asset_type="content", asset_path=file_name)
    return FileResponse(file_path, media_type="application/octet-stream", filename=file_path.name)
