from __future__ import annotations

import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

from ee2x_update_suite.shared.json_utils import load_json


@dataclass(slots=True)
class PublishBackendV2Config:
    backendBaseUrl: str
    adminUsername: str
    adminPassword: str
    channel: str
    butlerExe: str
    vpkCommand: str
    launcherPackId: str
    launcherMainExe: str


def load_publish_config(config_path: Path) -> PublishBackendV2Config:
    payload = load_json(config_path, default={}) or {}
    return PublishBackendV2Config(
        backendBaseUrl=str(payload.get("backendBaseUrl", "")).rstrip("/"),
        adminUsername=str(payload.get("adminUsername", "ee2x")).strip() or "ee2x",
        adminPassword=str(payload.get("adminPassword", "ee2x")) or "ee2x",
        channel=str(payload.get("channel", "stable")).strip() or "stable",
        butlerExe=str(payload.get("butlerExe", "")).strip(),
        vpkCommand=str(payload.get("vpkCommand", "")).strip(),
        launcherPackId=str(payload.get("launcherPackId", "com.ee2x.launcher")).strip() or "com.ee2x.launcher",
        launcherMainExe=str(payload.get("launcherMainExe", "地球帝国二代远航版启动器.exe")).strip() or "地球帝国二代远航版启动器.exe",
    )


def _auth_headers(config: PublishBackendV2Config) -> dict[str, str]:
    token = base64.b64encode(
        f"{config.adminUsername}:{config.adminPassword}".encode("utf-8")
    ).decode("ascii")
    return {"Authorization": f"Basic {token}"}


def fetch_manifest(config_path: Path) -> dict[str, Any]:
    config = load_publish_config(config_path)
    response = requests.get(
        f"{config.backendBaseUrl}/api/update/v2/channels/{config.channel}/manifest",
        timeout=20,
    )
    response.raise_for_status()
    return response.json()


def fetch_history(config_path: Path) -> dict[str, Any]:
    config = load_publish_config(config_path)
    response = requests.get(
        f"{config.backendBaseUrl}/api/update/v2/channels/{config.channel}/history",
        timeout=20,
    )
    response.raise_for_status()
    return response.json()


def publish_bundle_http(bundle_path: Path, config_path: Path) -> dict[str, Any]:
    config = load_publish_config(config_path)
    with bundle_path.open("rb") as handle:
        response = requests.post(
            f"{config.backendBaseUrl}/api/update/v2/releases/publish-bundle",
            headers=_auth_headers(config),
            data={"channel": config.channel},
            files={"bundleFile": (bundle_path.name, handle, "application/zip")},
            timeout=600,
        )
    response.raise_for_status()
    return response.json()


def promote_release_http(config_path: Path, release_id: str) -> dict[str, Any]:
    config = load_publish_config(config_path)
    response = requests.post(
        f"{config.backendBaseUrl}/api/update/v2/channels/{config.channel}/promote/{release_id}",
        headers=_auth_headers(config),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def rollback_release_http(config_path: Path, release_id: str) -> dict[str, Any]:
    config = load_publish_config(config_path)
    response = requests.post(
        f"{config.backendBaseUrl}/api/update/v2/channels/{config.channel}/rollback/{release_id}",
        headers=_auth_headers(config),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()
