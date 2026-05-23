from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import PurePosixPath, Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from ee2x_update_suite.shared.constants import (
    DEFAULT_CHANNEL,
    LATEST_FILE_NAME,
    PACKAGE_SCOPE_GAME,
    PACKAGE_SCOPE_LAUNCHER,
    RELEASE_MANIFEST_NAME,
    RELEASE_NOTES_NAME,
)
from ee2x_update_suite.shared.json_utils import load_json, save_json
from ee2x_update_suite.shared.manifest_builder import build_latest_descriptor, bump_patch_version
from ee2x_update_suite.shared.models import LatestRelease, ReleaseManifest, ReleasePackage


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
    except ImportError as exc:
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


def _sftp_read_text(sftp, remote_path: str) -> str:
    with sftp.open(remote_path, "r") as handle:
        return handle.read().decode("utf-8")


def load_json_from_bytes(payload: bytes) -> dict:
    import json

    return json.loads(payload.decode("utf-8"))


def latest_url_for_config(config: PublishConfig) -> str:
    return f"{config.publicBaseUrl}/updates/{config.channel}/{LATEST_FILE_NAME}"


def latest_url_for_path(config_path: Path) -> str:
    return latest_url_for_config(load_publish_config(config_path))


def latest_release_from_dict(payload: dict) -> LatestRelease:
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


def fetch_remote_latest(config_path: Path) -> LatestRelease | None:
    config = load_publish_config(config_path)
    verify_url = latest_url_for_config(config)
    try:
        with urlopen(verify_url, timeout=15) as response:
            return latest_release_from_dict(load_json_from_bytes(response.read()))
    except (HTTPError, URLError, OSError, ValueError):
        return None


def fetch_remote_latest_version(config_path: Path) -> str:
    latest = fetch_remote_latest(config_path)
    return latest.version if latest else ""


def guess_next_version(config_path: Path) -> str:
    return bump_patch_version(fetch_remote_latest_version(config_path))


def resolve_scope_package(latest: LatestRelease | None, scope: str) -> ReleasePackage | None:
    if latest is None:
        return None
    packages = latest.packages or {}
    if scope in packages and packages[scope].packageUrl:
        return packages[scope]
    if scope == PACKAGE_SCOPE_GAME and latest.packageUrl:
        return ReleasePackage(
            manifestUrl=latest.manifestUrl,
            packageUrl=latest.packageUrl,
            packageSha256=latest.packageSha256,
            packageSize=latest.packageSize,
        )
    return None


def _manifest_has_client_visible_launcher_change(manifest_payload: dict[str, Any] | None) -> bool:
    if not isinstance(manifest_payload, dict):
        return False
    files = manifest_payload.get("files", []) or []
    return bool(files)



def release_manifest_from_dict(payload: dict) -> ReleaseManifest:
    from ee2x_update_suite.shared.models import ManifestFileEntry

    files = [ManifestFileEntry(**item) for item in payload.get("files", [])]
    return ReleaseManifest(
        schemaVersion=payload["schemaVersion"],
        version=payload["version"],
        rootDirName=payload["rootDirName"],
        packageFileName=payload["packageFileName"],
        packageSha256=payload["packageSha256"],
        applyMode=payload["applyMode"],
        protectedPaths=list(payload.get("protectedPaths", [])),
        deleteList=list(payload.get("deleteList", [])),
        files=files,
    )


def fetch_remote_scope_manifest(config_path: Path, scope: str) -> ReleaseManifest | None:
    latest = fetch_remote_latest(config_path)
    package = resolve_scope_package(latest, scope)
    if package is None or not package.manifestUrl:
        return None
    try:
        with urlopen(package.manifestUrl, timeout=15) as response:
            return release_manifest_from_dict(load_json_from_bytes(response.read()))
    except (HTTPError, URLError, OSError, ValueError, KeyError):
        return None


def fetch_release_history(config_path: Path, limit: int = 20) -> list[dict[str, Any]]:
    config = load_publish_config(config_path)
    remote_releases_dir = f"{config.remoteRoot}/updates/{config.channel}/releases"
    client = _connect(config)
    history: list[dict[str, Any]] = []
    try:
        sftp = client.open_sftp()
        try:
            entries = sorted(
                [item for item in sftp.listdir_attr(remote_releases_dir) if item.filename not in {".", ".."}],
                key=lambda item: (getattr(item, "st_mtime", 0), item.filename),
                reverse=True,
            )
        except IOError:
            return []

        for item in entries[:limit]:
            release_id = item.filename
            release_dir = f"{remote_releases_dir}/{release_id}"
            notes = ""
            generated_at = ""
            version = release_id
            launcher_file_count = 0
            game_file_count = 0
            launcher_deleted_count = 0
            game_deleted_count = 0

            try:
                notes = _sftp_read_text(sftp, f"{release_dir}/{RELEASE_NOTES_NAME}").strip()
            except IOError:
                notes = ""

            try:
                meta = load_json_from_bytes(_sftp_read_text(sftp, f"{release_dir}/release-meta.json").encode("utf-8"))
                generated_at = str(meta.get("generatedAt", ""))
                version = str(meta.get("version", release_id))
            except (IOError, ValueError, KeyError):
                generated_at = ""

            for scope in (PACKAGE_SCOPE_LAUNCHER, PACKAGE_SCOPE_GAME):
                try:
                    manifest_payload = load_json_from_bytes(
                        _sftp_read_text(sftp, f"{release_dir}/{scope}/{RELEASE_MANIFEST_NAME}").encode("utf-8")
                    )
                    manifest = release_manifest_from_dict(manifest_payload)
                    if scope == PACKAGE_SCOPE_LAUNCHER:
                        launcher_file_count = len(manifest.files)
                        launcher_deleted_count = len(manifest.deleteList)
                        version = manifest.version or version
                    else:
                        game_file_count = len(manifest.files)
                        game_deleted_count = len(manifest.deleteList)
                        version = manifest.version or version
                except (IOError, ValueError, KeyError):
                    if scope == PACKAGE_SCOPE_GAME:
                        try:
                            legacy_payload = load_json_from_bytes(
                                _sftp_read_text(sftp, f"{release_dir}/{RELEASE_MANIFEST_NAME}").encode("utf-8")
                            )
                            legacy_manifest = release_manifest_from_dict(legacy_payload)
                            game_file_count = len(legacy_manifest.files)
                            game_deleted_count = len(legacy_manifest.deleteList)
                            version = legacy_manifest.version or version
                        except (IOError, ValueError, KeyError):
                            pass

            if not generated_at and getattr(item, "st_mtime", 0):
                generated_at = datetime.fromtimestamp(item.st_mtime, tz=timezone.utc).isoformat()

            history.append(
                {
                    "releaseId": release_id,
                    "version": version,
                    "generatedAt": generated_at,
                    "notes": notes,
                    "launcherFileCount": launcher_file_count,
                    "gameFileCount": game_file_count,
                    "launcherDeletedCount": launcher_deleted_count,
                    "gameDeletedCount": game_deleted_count,
                }
            )
        sftp.close()
    finally:
        client.close()
    return history


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

    verify_url = latest_url_for_config(config)
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


def publish_dual_release(release_dir: Path, config_path: Path) -> dict[str, Any]:
    config = load_publish_config(config_path)
    notes_path = release_dir / RELEASE_NOTES_NAME
    notes = notes_path.read_text(encoding="utf-8").strip() if notes_path.exists() else ""
    published_at = datetime.now(timezone.utc).isoformat()
    release_id = release_dir.name
    remote_release_dir = f"{config.remoteRoot}/updates/{config.channel}/releases/{release_id}"
    public_release_dir = f"{config.publicBaseUrl}/updates/{config.channel}/releases/{release_id}"

    package_refs: dict[str, ReleasePackage] = {}
    manifest_payloads: dict[str, dict[str, Any]] = {}
    version = ""
    client = _connect(config)
    try:
        sftp = client.open_sftp()
        for scope in (PACKAGE_SCOPE_LAUNCHER, PACKAGE_SCOPE_GAME):
            package_dir = release_dir / scope
            manifest_path = package_dir / RELEASE_MANIFEST_NAME
            manifest = load_json(manifest_path, default={}) or {}
            manifest_payloads[scope] = manifest
            package_file_name = str(manifest.get("packageFileName", "")).strip()
            package_path = package_dir / package_file_name
            if not manifest_path.exists() or not package_file_name or not package_path.exists():
                raise RuntimeError(f"发布目录缺少 {scope} 包的 manifest 或 package 文件。")
            version = str(manifest.get("version", "")).strip() or version
            remote_scope_dir = f"{remote_release_dir}/{scope}"
            public_scope_dir = f"{public_release_dir}/{scope}"
            _upload_file(sftp, package_path, f"{remote_scope_dir}/{package_file_name}")
            _upload_file(sftp, manifest_path, f"{remote_scope_dir}/{RELEASE_MANIFEST_NAME}")
            package_refs[scope] = ReleasePackage(
                manifestUrl=f"{public_scope_dir}/{RELEASE_MANIFEST_NAME}",
                packageUrl=f"{public_scope_dir}/{package_file_name}",
                packageSha256=str(manifest.get("packageSha256", "")),
                packageSize=package_path.stat().st_size,
            )

        if notes_path.exists():
            _upload_file(sftp, notes_path, f"{remote_release_dir}/{RELEASE_NOTES_NAME}")

        announced_packages = {}
        for scope in (PACKAGE_SCOPE_GAME, PACKAGE_SCOPE_LAUNCHER):
            if scope in package_refs:
                announced_packages[scope] = package_refs[scope]

        primary_package = package_refs.get(PACKAGE_SCOPE_GAME) or package_refs.get(PACKAGE_SCOPE_LAUNCHER)
        if primary_package is None:
            raise RuntimeError("发布目录缺少有效的 game 或 launcher 包。")

        latest = build_latest_descriptor(
            channel=config.channel,
            version=version,
            release_notes=notes,
            manifest_url=primary_package.manifestUrl,
            package_url=primary_package.packageUrl,
            package_sha256=primary_package.packageSha256,
            package_size=primary_package.packageSize,
            published_at=published_at,
            required=True,
            packages=announced_packages,
        )
        latest_local_path = release_dir / LATEST_FILE_NAME
        save_json(latest_local_path, latest.to_dict())
        _upload_file(sftp, latest_local_path, f"{config.remoteRoot}/updates/{config.channel}/{LATEST_FILE_NAME}")
        sftp.close()
    finally:
        client.close()

    verify_url = latest_url_for_config(config)
    with urlopen(verify_url, timeout=15) as response:
        remote_latest = latest_release_from_dict(load_json_from_bytes(response.read()))
    if remote_latest.version != version:
        raise RuntimeError("发布后校验失败：latest.json 未返回目标版本。")

    return {
        "version": version,
        "releaseId": release_id,
        "publishedAt": published_at,
        "remoteReleaseDir": remote_release_dir,
        "latestUrl": verify_url,
        "packages": {
            scope: {
                "manifestUrl": package.manifestUrl,
                "packageUrl": package.packageUrl,
                "packageSha256": package.packageSha256,
                "packageSize": package.packageSize,
            }
            for scope, package in package_refs.items()
        },
    }
