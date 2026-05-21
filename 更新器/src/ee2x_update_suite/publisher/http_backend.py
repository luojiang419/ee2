from __future__ import annotations

import base64
import json
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

from ee2x_update_suite.shared.constants import DEFAULT_CHANNEL, LATEST_FILE_NAME, PACKAGE_SCOPE_GAME, PACKAGE_SCOPE_LAUNCHER, RELEASE_MANIFEST_NAME, RELEASE_NOTES_NAME
from ee2x_update_suite.shared.json_utils import load_json
from ee2x_update_suite.shared.models import LatestRelease, ReleasePackage


@dataclass(slots=True)
class PublishBackendConfig:
    backendBaseUrl: str
    adminUsername: str
    adminPassword: str
    channel: str = DEFAULT_CHANNEL


class MultipartFormStreamer:
    def __init__(
        self,
        *,
        fields: list[tuple[str, str]],
        files: list[tuple[str, Path, str]],
    ) -> None:
        self.boundary = f"----ee2x-{uuid.uuid4().hex}"
        self._parts: list[tuple[str, bytes, Path | None]] = []

        for name, value in fields:
            header = (
                f"--{self.boundary}\r\n"
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            ).encode("utf-8")
            body = str(value).encode("utf-8")
            self._parts.append(("field", header + body + b"\r\n", None))

        for field_name, file_path, content_type in files:
            header = (
                f"--{self.boundary}\r\n"
                f'Content-Disposition: form-data; name="{field_name}"; filename="{file_path.name}"\r\n'
                f"Content-Type: {content_type}\r\n\r\n"
            ).encode("utf-8")
            self._parts.append(("file-header", header, None))
            self._parts.append(("file-body", b"", file_path))
            self._parts.append(("file-tail", b"\r\n", None))

        self._closing = f"--{self.boundary}--\r\n".encode("utf-8")

    @property
    def content_type(self) -> str:
        return f"multipart/form-data; boundary={self.boundary}"

    def __len__(self) -> int:
        total = len(self._closing)
        for kind, payload, file_path in self._parts:
            total += len(payload)
            if kind == "file-body" and file_path is not None and file_path.exists():
                total += file_path.stat().st_size
        return total

    def __iter__(self):
        for kind, payload, file_path in self._parts:
            if payload:
                yield payload
            if kind == "file-body" and file_path is not None:
                with file_path.open("rb") as handle:
                    while True:
                        chunk = handle.read(1024 * 1024)
                        if not chunk:
                            break
                        yield chunk
        yield self._closing


def load_publish_config(config_path: Path) -> PublishBackendConfig:
    payload = load_json(config_path, default={}) or {}
    backend_base_url = str(payload.get("backendBaseUrl", "")).rstrip("/")
    if not backend_base_url:
        backend_base_url = str(payload.get("publicBaseUrl", "")).rstrip("/")
    return PublishBackendConfig(
        backendBaseUrl=backend_base_url,
        adminUsername=str(payload.get("adminUsername", "ee2x")).strip() or "ee2x",
        adminPassword=str(payload.get("adminPassword", "ee2x")) or "ee2x",
        channel=str(payload.get("channel", DEFAULT_CHANNEL)).strip() or DEFAULT_CHANNEL,
    )


def _auth_headers(config: PublishBackendConfig) -> dict[str, str]:
    token = base64.b64encode(
        f"{config.adminUsername}:{config.adminPassword}".encode("utf-8")
    ).decode("ascii")
    return {"Authorization": f"Basic {token}"}


def latest_release_from_dict(payload: dict[str, Any]) -> LatestRelease:
    packages: dict[str, ReleasePackage] = {}
    for name, package_payload in (payload.get("packages", {}) or {}).items():
        packages[str(name)] = ReleasePackage(
            manifestUrl=str(package_payload.get("manifestUrl", "")),
            packageUrl=str(package_payload.get("packageUrl", "")),
            packageSha256=str(package_payload.get("packageSha256", "")),
            packageSize=int(package_payload.get("packageSize", 0) or 0),
        )
    return LatestRelease(
        schemaVersion=int(payload.get("schemaVersion", 1) or 1),
        channel=str(payload.get("channel", DEFAULT_CHANNEL)),
        version=str(payload.get("version", "")),
        releaseNotes=str(payload.get("releaseNotes", "")),
        publishedAt=str(payload.get("publishedAt", "")),
        manifestUrl=str(payload.get("manifestUrl", "")),
        packageUrl=str(payload.get("packageUrl", "")),
        packageSha256=str(payload.get("packageSha256", "")),
        packageSize=int(payload.get("packageSize", 0) or 0),
        required=bool(payload.get("required", True)),
        packages=packages,
    )


def latest_api_url(config: PublishBackendConfig) -> str:
    return f"{config.backendBaseUrl}/api/update/v1/channels/{config.channel}/latest"


def static_latest_url(config: PublishBackendConfig) -> str:
    return f"{config.backendBaseUrl}/updates/{config.channel}/{LATEST_FILE_NAME}"


def history_api_url(config: PublishBackendConfig, limit: int = 0) -> str:
    return f"{config.backendBaseUrl}/api/update/v1/channels/{config.channel}/history?limit={limit}"


def delete_release_api_url(config: PublishBackendConfig, release_id: str) -> str:
    return f"{config.backendBaseUrl}/api/update/v1/channels/{config.channel}/releases/{release_id}"


def fetch_remote_latest(config_path: Path) -> LatestRelease | None:
    config = load_publish_config(config_path)
    for url in (latest_api_url(config), static_latest_url(config)):
        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            return latest_release_from_dict(response.json())
        except Exception:
            continue
    return None


def fetch_remote_latest_version(config_path: Path) -> str:
    latest = fetch_remote_latest(config_path)
    return latest.version if latest else ""


def fetch_release_history(config_path: Path, limit: int = 0) -> dict[str, Any]:
    config = load_publish_config(config_path)
    response = requests.get(history_api_url(config, limit=limit), timeout=20)
    response.raise_for_status()
    return response.json()


def delete_release_http(config_path: Path, release_id: str) -> dict[str, Any]:
    config = load_publish_config(config_path)
    response = requests.delete(
        delete_release_api_url(config, release_id),
        headers=_auth_headers(config),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def publish_release_http(release_dir: Path, config_path: Path) -> dict[str, Any]:
    config = load_publish_config(config_path)
    notes_path = release_dir / RELEASE_NOTES_NAME
    notes = notes_path.read_text(encoding="utf-8").strip() if notes_path.exists() else ""
    launcher_manifest_path = release_dir / PACKAGE_SCOPE_LAUNCHER / RELEASE_MANIFEST_NAME
    game_manifest_path = release_dir / PACKAGE_SCOPE_GAME / RELEASE_MANIFEST_NAME
    launcher_manifest = load_json(launcher_manifest_path, default={}) or {}
    game_manifest = load_json(game_manifest_path, default={}) or {}
    version = str(game_manifest.get("version") or launcher_manifest.get("version") or "").strip()
    if not version:
        raise RuntimeError("发布目录缺少版本号。")
    launcher_package_path = release_dir / PACKAGE_SCOPE_LAUNCHER / str(launcher_manifest.get("packageFileName", "")).strip()
    game_package_path = release_dir / PACKAGE_SCOPE_GAME / str(game_manifest.get("packageFileName", "")).strip()
    if not launcher_package_path.exists() or not game_package_path.exists():
        raise RuntimeError("发布目录缺少 launcher/game package 文件。")

    headers = _auth_headers(config)
    streamer = MultipartFormStreamer(
        fields=[
            ("channel", config.channel),
            ("version", version),
            ("releaseNotes", notes),
            ("required", "true"),
        ],
        files=[
            ("launcherManifest", launcher_manifest_path, "application/json"),
            ("launcherPackage", launcher_package_path, "application/zip"),
            ("gameManifest", game_manifest_path, "application/json"),
            ("gamePackage", game_package_path, "application/zip"),
        ],
    )
    headers["Content-Type"] = streamer.content_type
    headers["Content-Length"] = str(len(streamer))
    response = requests.post(
        f"{config.backendBaseUrl}/api/update/v1/releases/publish",
        headers=headers,
        data=streamer,
        timeout=180,
    )
    response.raise_for_status()
    return response.json()


def publish_bundle_http(bundle_path: Path, config_path: Path) -> dict[str, Any]:
    config = load_publish_config(config_path)
    with bundle_path.open("rb") as handle:
        response = requests.post(
            f"{config.backendBaseUrl}/api/update/v1/releases/publish-bundle",
            headers=_auth_headers(config),
            files={
                "bundleFile": (bundle_path.name, handle, "application/zip"),
            },
            timeout=180,
        )
    response.raise_for_status()
    return response.json()


def read_release_summary(release_dir: Path) -> dict[str, Any]:
    launcher_manifest_path = release_dir / PACKAGE_SCOPE_LAUNCHER / RELEASE_MANIFEST_NAME
    game_manifest_path = release_dir / PACKAGE_SCOPE_GAME / RELEASE_MANIFEST_NAME
    launcher_manifest = load_json(launcher_manifest_path, default={}) or {}
    game_manifest = load_json(game_manifest_path, default={}) or {}
    launcher_files = launcher_manifest.get("files", []) or []
    game_files = game_manifest.get("files", []) or []
    launcher_delete_list = launcher_manifest.get("deleteList", []) or []
    game_delete_list = game_manifest.get("deleteList", []) or []
    return {
        "version": str(game_manifest.get("version") or launcher_manifest.get("version") or "").strip(),
        "launcherFileCount": len(launcher_files),
        "gameFileCount": len(game_files),
        "launcherDeletedCount": len(launcher_delete_list),
        "gameDeletedCount": len(game_delete_list),
        "launcherTriggersSelfUpdate": bool(launcher_files or launcher_delete_list),
        "launcherPackagePath": str(release_dir / PACKAGE_SCOPE_LAUNCHER / str(launcher_manifest.get("packageFileName", "")).strip()),
        "gamePackagePath": str(release_dir / PACKAGE_SCOPE_GAME / str(game_manifest.get("packageFileName", "")).strip()),
    }
