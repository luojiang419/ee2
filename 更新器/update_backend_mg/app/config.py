from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


@dataclass(slots=True)
class Settings:
    base_dir: Path
    host: str
    port: int
    default_channel: str
    admin_username: str
    admin_password: str
    static_base_url: str
    storage_updates_dir: Path
    storage_tmp_dir: Path
    db_path: Path
    legacy_updates_source: Path


def load_settings(base_dir: Path | None = None) -> Settings:
    resolved_base_dir = (base_dir or Path(__file__).resolve().parents[1]).resolve()
    env_values = _read_env_file(resolved_base_dir / ".env")

    def read(name: str, default: str) -> str:
        return os.environ.get(name, env_values.get(name, default))

    host = read("EE2X_UPDATE_HOST", "0.0.0.0")
    port = int(read("EE2X_UPDATE_PORT", "3010"))
    default_channel = read("EE2X_UPDATE_DEFAULT_CHANNEL", "stable")
    admin_username = read("EE2X_UPDATE_ADMIN_USERNAME", "ee2x").strip() or "ee2x"
    admin_password = read("EE2X_UPDATE_ADMIN_PASSWORD", "ee2x").strip() or "ee2x"
    static_base_url = read("EE2X_UPDATE_STATIC_BASE_URL", f"http://115.231.35.105:{port}").rstrip("/")
    storage_updates_dir = Path(read("EE2X_UPDATE_STORAGE_UPDATES_DIR", str(resolved_base_dir / "storage" / "updates"))).resolve()
    storage_tmp_dir = Path(read("EE2X_UPDATE_STORAGE_TMP_DIR", str(resolved_base_dir / "storage" / "tmp"))).resolve()
    db_path = Path(read("EE2X_UPDATE_DB_PATH", str(resolved_base_dir / "db" / "update_service.sqlite3"))).resolve()
    legacy_updates_source = Path(read("EE2X_UPDATE_LEGACY_SOURCE", "/opt/ee2x_up-xg/updates")).resolve()

    storage_updates_dir.mkdir(parents=True, exist_ok=True)
    storage_tmp_dir.mkdir(parents=True, exist_ok=True)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    return Settings(
        base_dir=resolved_base_dir,
        host=host,
        port=port,
        default_channel=default_channel,
        admin_username=admin_username,
        admin_password=admin_password,
        static_base_url=static_base_url,
        storage_updates_dir=storage_updates_dir,
        storage_tmp_dir=storage_tmp_dir,
        db_path=db_path,
        legacy_updates_source=legacy_updates_source,
    )
