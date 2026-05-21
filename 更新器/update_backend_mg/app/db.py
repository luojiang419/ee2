from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS channels (
    channel TEXT PRIMARY KEY,
    current_release_id TEXT NOT NULL,
    current_version TEXT NOT NULL,
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
    latest_json_path TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(channel, release_id)
);

CREATE TABLE IF NOT EXISTS release_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL,
    scope TEXT NOT NULL,
    root_dir_name TEXT NOT NULL,
    package_file_name TEXT NOT NULL,
    package_sha256 TEXT NOT NULL,
    package_size INTEGER NOT NULL,
    manifest_path TEXT NOT NULL,
    package_path TEXT NOT NULL,
    file_count INTEGER NOT NULL,
    delete_count INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(release_id, scope),
    FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS release_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_package_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    size INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    UNIQUE(release_package_id, path),
    FOREIGN KEY(release_package_id) REFERENCES release_packages(id) ON DELETE CASCADE
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
