from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, File, Form, Header, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .config import Settings, load_settings
from .db import db_session, init_db
from .service import (
    build_publish_payload,
    build_publish_payload_from_bundle,
    delete_release,
    get_channel_current,
    get_history,
    get_latest_payload,
    import_legacy_updates,
    legacy_manifest_payload,
    publish_release,
    rebuild_index_from_storage,
    verify_publish_auth,
    verify_publish_username_password,
)


settings = load_settings()
init_db(settings.db_path)
publish_dir = Path(__file__).resolve().parent / "publish"

app = FastAPI(title="EE2X Update MG", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/updates", StaticFiles(directory=str(settings.storage_updates_dir)), name="updates")
app.mount("/publish/assets", StaticFiles(directory=str(publish_dir / "assets")), name="publish-assets")


@app.get("/api/update/v1/health")
def health() -> dict:
    with db_session(settings.db_path) as conn:
        channel_count = conn.execute("SELECT COUNT(*) FROM channels").fetchone()[0]
        release_count = conn.execute("SELECT COUNT(*) FROM releases").fetchone()[0]
    return {
        "ok": True,
        "service": "ee2x-update-mg",
        "version": "1.0.0",
        "time": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "storageUpdatesDir": str(settings.storage_updates_dir),
        "dbPath": str(settings.db_path),
        "channelCount": int(channel_count),
        "releaseCount": int(release_count),
    }


@app.get("/api/update/v1/channels/{channel}/latest")
def latest(channel: str):
    with db_session(settings.db_path) as conn:
        payload = get_latest_payload(settings, conn, channel)
    return JSONResponse(payload)


@app.get("/api/update/v1/channels/{channel}/history")
def history(channel: str, limit: int = 20):
    with db_session(settings.db_path) as conn:
        current = get_channel_current(conn, channel) or {}
        items = get_history(conn, channel, limit)
    return {
        "ok": True,
        "channel": channel,
        "currentReleaseId": str(current.get("current_release_id", "")),
        "currentVersion": str(current.get("current_version", "")),
        "history": items,
    }


@app.get("/publish")
def publish_page_redirect():
    return RedirectResponse(url="/publish/")


@app.get("/publish/", response_class=HTMLResponse)
def publish_page() -> HTMLResponse:
    html = (publish_dir / "index.html").read_text(encoding="utf-8")
    return HTMLResponse(html.replace("__DEFAULT_CHANNEL__", settings.default_channel))


@app.post("/api/update/v1/auth/login")
def login(
    username: str = Form(...),
    password: str = Form(...),
):
    verify_publish_username_password(settings, username.strip(), password)
    return {
        "ok": True,
        "username": settings.admin_username,
        "channel": settings.default_channel,
    }


@app.post("/api/update/v1/releases/publish")
async def publish(
    request: Request,
    channel: str = Form(...),
    version: str = Form(...),
    releaseNotes: str = Form(""),
    required: str = Form("true"),
    launcherManifest: UploadFile = File(...),
    launcherPackage: UploadFile = File(...),
    gameManifest: UploadFile = File(...),
    gamePackage: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    verify_publish_auth(settings, authorization)
    payloads, temp_dir = await build_publish_payload(
        temp_root=settings.storage_tmp_dir,
        version=version,
        launcher_manifest=launcherManifest,
        launcher_package=launcherPackage,
        game_manifest=gameManifest,
        game_package=gamePackage,
    )
    try:
        result = publish_release(
            settings,
            channel=channel.strip() or settings.default_channel,
            version=version.strip(),
            release_notes=releaseNotes,
            required=str(required).strip().lower() not in {"false", "0", "no"},
            payloads=payloads,
            remote_addr=request.client.host if request.client else "",
        )
        return {"ok": True, **result}
    finally:
        __import__("shutil").rmtree(temp_dir, ignore_errors=True)


@app.post("/api/update/v1/releases/publish-bundle")
async def publish_bundle(
    request: Request,
    bundleFile: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    verify_publish_auth(settings, authorization)
    version, release_notes, payloads, temp_dir = await build_publish_payload_from_bundle(
        temp_root=settings.storage_tmp_dir,
        bundle_file=bundleFile,
    )
    try:
        result = publish_release(
            settings,
            channel=settings.default_channel,
            version=version,
            release_notes=release_notes,
            required=True,
            payloads=payloads,
            remote_addr=request.client.host if request.client else "",
        )
        return {"ok": True, **result}
    finally:
        __import__("shutil").rmtree(temp_dir, ignore_errors=True)


@app.delete("/api/update/v1/channels/{channel}/releases/{release_id}")
def delete_channel_release(
    channel: str,
    release_id: str,
    authorization: str | None = Header(default=None),
):
    verify_publish_auth(settings, authorization)
    result = delete_release(settings, channel=channel, release_id=release_id)
    return {"ok": True, **result}


@app.get("/manifest")
def legacy_manifest(channel: str | None = None):
    with db_session(settings.db_path) as conn:
        payload = legacy_manifest_payload(settings, conn, channel or settings.default_channel)
    return JSONResponse(payload)


@app.get("/api/version/latest")
def legacy_latest(channel: str | None = None):
    with db_session(settings.db_path) as conn:
        payload = legacy_manifest_payload(settings, conn, channel or settings.default_channel)
    return JSONResponse(payload)


@app.get("/api/version/history")
def legacy_history(channel: str | None = None, limit: int = 20):
    with db_session(settings.db_path) as conn:
        items = get_history(conn, channel or settings.default_channel, limit)
    return {"versions": items}


def main() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)


if __name__ == "__main__":
    main()
