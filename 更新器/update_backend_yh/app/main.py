from __future__ import annotations

from pathlib import Path
import asyncio

from fastapi import FastAPI, File, Form, Header, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .config import Settings, load_settings
from .db import db_session, init_db
from .service import (
    build_publish_payload,
    build_publish_payload_from_bundle,
    delete_release,
    rebuild_channel_latest,
    get_channel_current,
    get_history,
    get_history_total_count,
    get_latest_payload,
    increment_release_package_download,
    import_legacy_updates,
    legacy_manifest_payload,
    publish_release,
    rebuild_index_from_storage,
    ensure_latest_json_file_current,
    resolve_release_manifest_file,
    resolve_release_package_file,
    verify_publish_auth,
    verify_publish_username_password,
)


settings = load_settings()
init_db(settings.db_path)
publish_dir = Path(__file__).resolve().parent / "publish"

app = FastAPI(title="EE2X Update YH", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/publish/assets", StaticFiles(directory=str(publish_dir / "assets")), name="publish-assets")

_channel_ws_clients: dict[str, set[WebSocket]] = {}
_channel_ws_lock = asyncio.Lock()


async def _register_channel_ws(channel: str, websocket: WebSocket) -> None:
    async with _channel_ws_lock:
        bucket = _channel_ws_clients.setdefault(channel, set())
        bucket.add(websocket)


async def _unregister_channel_ws(channel: str, websocket: WebSocket) -> None:
    async with _channel_ws_lock:
        bucket = _channel_ws_clients.get(channel)
        if not bucket:
            return
        bucket.discard(websocket)
        if not bucket:
            _channel_ws_clients.pop(channel, None)


async def _broadcast_channel_update(channel: str, *, version: str, required: bool) -> None:
    async with _channel_ws_lock:
        targets = list(_channel_ws_clients.get(channel, set()))
    if not targets:
        return
    payload = {
        "type": "update_available",
        "channel": channel,
        "version": version,
        "required": required,
    }
    stale: list[WebSocket] = []
    for websocket in targets:
        try:
            await websocket.send_json(payload)
        except Exception:
            stale.append(websocket)
    for websocket in stale:
        await _unregister_channel_ws(channel, websocket)


@app.get("/api/update/v1/health")
def health() -> dict:
    with db_session(settings.db_path) as conn:
        channel_count = conn.execute("SELECT COUNT(*) FROM channels").fetchone()[0]
        release_count = conn.execute("SELECT COUNT(*) FROM releases").fetchone()[0]
    return {
        "ok": True,
        "service": "ee2x-update-yh",
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
def history(channel: str, limit: int = 0):
    with db_session(settings.db_path) as conn:
        current = get_channel_current(conn, channel) or {}
        total_count = get_history_total_count(conn, channel)
        items = get_history(conn, channel, limit)
    return {
        "ok": True,
        "channel": channel,
        "currentReleaseId": str(current.get("current_release_id", "")),
        "currentVersion": str(current.get("current_version", "")),
        "historyTotalCount": total_count,
        "returnedCount": len(items),
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
        await _broadcast_channel_update(
            channel=channel.strip() or settings.default_channel,
            version=result["version"],
            required=str(required).strip().lower() not in {"false", "0", "no"},
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
        await _broadcast_channel_update(
            channel=settings.default_channel,
            version=result["version"],
            required=True,
        )
        return {"ok": True, **result}
    finally:
        __import__("shutil").rmtree(temp_dir, ignore_errors=True)


@app.websocket("/api/update/v1/channels/{channel}/ws")
async def channel_updates_ws(websocket: WebSocket, channel: str):
    await websocket.accept()
    await _register_channel_ws(channel, websocket)
    try:
        await websocket.send_json({"type": "connected", "channel": channel})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await _unregister_channel_ws(channel, websocket)


@app.delete("/api/update/v1/channels/{channel}/releases/{release_id}")
def delete_channel_release(
    channel: str,
    release_id: str,
    authorization: str | None = Header(default=None),
):
    verify_publish_auth(settings, authorization)
    result = delete_release(settings, channel=channel, release_id=release_id)
    return {"ok": True, **result}


@app.post("/api/update/v1/channels/{channel}/latest/rebuild")
def rebuild_channel_latest_api(
    channel: str,
    authorization: str | None = Header(default=None),
):
    verify_publish_auth(settings, authorization)
    with db_session(settings.db_path) as conn:
        result = rebuild_channel_latest(settings, conn, channel)
    return {"ok": True, **result}


@app.get("/updates/{channel}/latest.json")
def latest_static(channel: str):
    with db_session(settings.db_path) as conn:
        latest_path = ensure_latest_json_file_current(settings, conn, channel)
    return FileResponse(latest_path, media_type="application/json")


@app.get("/updates/{channel}/releases/{release_id}/{scope}/release-manifest.json")
def release_manifest_static(channel: str, release_id: str, scope: str):
    with db_session(settings.db_path) as conn:
        manifest_path = resolve_release_manifest_file(
            settings,
            conn,
            channel=channel,
            release_id=release_id,
            scope=scope,
        )
    return FileResponse(manifest_path, media_type="application/json")


@app.get("/updates/{channel}/releases/{release_id}/{scope}/{package_file_name}")
def release_package_static(
    channel: str,
    release_id: str,
    scope: str,
    package_file_name: str,
):
    with db_session(settings.db_path) as conn:
        package_path, package_row = resolve_release_package_file(
            settings,
            conn,
            channel=channel,
            release_id=release_id,
            scope=scope,
            package_file_name=package_file_name,
        )
        increment_release_package_download(conn, int(package_row["id"]))
    return FileResponse(
        package_path,
        media_type="application/zip",
        filename=package_file_name,
    )


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
def legacy_history(channel: str | None = None, limit: int = 0):
    with db_session(settings.db_path) as conn:
        items = get_history(conn, channel or settings.default_channel, limit)
    return {"versions": items}


def main() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)


if __name__ == "__main__":
    main()
