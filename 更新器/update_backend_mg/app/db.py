from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS channels (
    channel TEXT PRIMARY KEY,
    current_release_id TEXT NOT NULL DEFAULT '',
    current_version TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    release_id TEXT NOT NULL,
    version TEXT NOT NULL,
    notes TEXT NOT NULL,
    required INTEGER NOT NULL DEFAULT 1,
    published_at TEXT NOT NULL,
    manifest_path TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(channel, release_id)
);

CREATE TABLE IF NOT EXISTS release_launcher_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL,
    feed_path TEXT NOT NULL,
    metadata_path TEXT NOT NULL,
    package_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(release_id),
    FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS release_runtime_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL,
    manifest_path TEXT NOT NULL,
    package_path TEXT NOT NULL,
    package_sha256 TEXT NOT NULL,
    package_size INTEGER NOT NULL,
    file_count INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(release_id),
    FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS release_content_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL,
    manifest_path TEXT NOT NULL,
    delta_from_release_id TEXT NOT NULL DEFAULT '',
    delta_package_path TEXT NOT NULL DEFAULT '',
    delta_signature_path TEXT NOT NULL DEFAULT '',
    full_package_path TEXT NOT NULL,
    full_signature_path TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(release_id),
    FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS release_cleanup_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    UNIQUE(release_id, path),
    FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS downloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL,
    asset_type TEXT NOT NULL,
    asset_path TEXT NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    last_downloaded_at TEXT NOT NULL DEFAULT '',
    UNIQUE(release_id, asset_type, asset_path),
    FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS publish_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    remote_addr TEXT,
    error_message TEXT
);
"""


def init_db(db_path: Path) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.executescript(SCHEMA_SQL)
        conn.commit()


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db_session(db_path: Path) -> Iterator[sqlite3.Connection]:
    conn = connect(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
