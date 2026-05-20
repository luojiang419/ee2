from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import PurePosixPath, Path
from typing import Any
from urllib.request import urlopen

from ee2x_update_suite.shared.constants import DEFAULT_CHANNEL, LATEST_FILE_NAME, RELEASE_MANIFEST_NAME, RELEASE_NOTES_NAME
from ee2x_update_suite.shared.json_utils import load_json, save_json
from ee2x_update_suite.shared.manifest_builder import build_latest_descriptor


@dataclass(slots=True)
class PublishConfig:
    sshHost: str
    sshPort: int
    sshUsername: str
    sshPassword: str
    sshPrivateKey: str
    remoteRoot: str
    publicBaseUrl: str
    channel: str = DEFAULT_CHANNEL


def load_publish_config(config_path: Path) -> PublishConfig:
    payload = load_json(config_path, default={}) or {}
    return PublishConfig(
        sshHost=str(payload.get("sshHost", "")).strip(),
        sshPort=int(payload.get("sshPort", 22)),
        sshUsername=str(payload.get("sshUsername", "")).strip(),
        sshPassword=str(payload.get("sshPassword", "")),
        sshPrivateKey=str(payload.get("sshPrivateKey", "")).strip(),
        remoteRoot=str(payload.get("remoteRoot", "")).rstrip("/"),
        publicBaseUrl=str(payload.get("publicBaseUrl", "")).rstrip("/"),
        channel=str(payload.get("channel", DEFAULT_CHANNEL)).strip() or DEFAULT_CHANNEL,
    )


def _require_paramiko():
    try:
        import paramiko  # type: ignore
    except ImportError as exc:  # pragma: no cover - 依赖缺失时提示
        raise RuntimeError("推送发布需要安装 paramiko，请先执行 pip install -r 更新器/requirements.txt") from exc
    return paramiko


def _connect(config: PublishConfig):
    paramiko = _require_paramiko()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    kwargs: dict[str, Any] = {
        "hostname": config.sshHost,
        "port": config.sshPort,
        "username": config.sshUsername,
        "timeout": 15,
    }
    if config.sshPrivateKey:
        kwargs["key_filename"] = config.sshPrivateKey
    else:
        kwargs["password"] = config.sshPassword
    client.connect(**kwargs)
    return client


def _sftp_mkdirs(sftp, remote_dir: str) -> None:
    current = PurePosixPath("/")
    for part in PurePosixPath(remote_dir).parts:
        if part == "/":
            continue
        current /= part
        try:
            sftp.stat(str(current))
        except IOError:
            sftp.mkdir(str(current))


def _upload_file(sftp, local_path: Path, remote_path: str) -> None:
    _sftp_mkdirs(sftp, str(PurePosixPath(remote_path).parent))
    temp_remote = f"{remote_path}.tmp"
    sftp.put(str(local_path), temp_remote)
    sftp.rename(temp_remote, remote_path)


def publish_release(release_dir: Path, config_path: Path) -> dict[str, Any]:
    config = load_publish_config(config_path)
    manifest_path = release_dir / RELEASE_MANIFEST_NAME
    notes_path = release_dir / RELEASE_NOTES_NAME
    manifest = load_json(manifest_path, default={}) or {}
    version = manifest.get("version", "")
    package_file_name = manifest.get("packageFileName", "")
    package_path = release_dir / package_file_name
    if not version or not package_path.exists():
        raise RuntimeError("发布目录缺少 manifest.version 或 package 文件。")

    release_id = release_dir.name
    remote_release_dir = f"{config.remoteRoot}/updates/{config.channel}/releases/{release_id}"
    public_release_dir = f"{config.publicBaseUrl}/updates/{config.channel}/releases/{release_id}"
    published_at = datetime.now(timezone.utc).isoformat()
    notes = notes_path.read_text(encoding="utf-8").strip() if notes_path.exists() else ""
    latest = build_latest_descriptor(
        channel=config.channel,
        version=version,
        release_notes=notes,
        manifest_url=f"{public_release_dir}/{RELEASE_MANIFEST_NAME}",
        package_url=f"{public_release_dir}/{package_file_name}",
        package_sha256=manifest["packageSha256"],
        package_size=package_path.stat().st_size,
        published_at=published_at,
    )

    latest_local_path = release_dir / LATEST_FILE_NAME
    save_json(latest_local_path, latest.to_dict())

    client = _connect(config)
    try:
        sftp = client.open_sftp()
        _upload_file(sftp, package_path, f"{remote_release_dir}/{package_file_name}")
        _upload_file(sftp, manifest_path, f"{remote_release_dir}/{RELEASE_MANIFEST_NAME}")
        if notes_path.exists():
            _upload_file(sftp, notes_path, f"{remote_release_dir}/{RELEASE_NOTES_NAME}")
        _upload_file(sftp, latest_local_path, f"{config.remoteRoot}/updates/{config.channel}/{LATEST_FILE_NAME}")
        sftp.close()
    finally:
        client.close()

    verify_url = f"{config.publicBaseUrl}/updates/{config.channel}/{LATEST_FILE_NAME}"
    with urlopen(verify_url, timeout=15) as response:
        remote_latest = load_json_from_bytes(response.read())
    if remote_latest.get("version") != version:
        raise RuntimeError("发布后校验失败：latest.json 未返回目标版本。")

    return {
        "version": version,
        "releaseId": release_id,
        "remoteReleaseDir": remote_release_dir,
        "latestUrl": verify_url,
        "packageUrl": latest.packageUrl,
        "manifestUrl": latest.manifestUrl,
    }


def load_json_from_bytes(payload: bytes) -> dict:
    import json

    return json.loads(payload.decode("utf-8"))
