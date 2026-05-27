from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    major INTEGER NOT NULL,
    minor INTEGER NOT NULL,
    patch INTEGER NOT NULL,
    notes TEXT NOT NULL,
    target TEXT NOT NULL,
    arch TEXT NOT NULL,
    updater_sha256 TEXT NOT NULL,
    updater_size INTEGER NOT NULL,
    setup_sha256 TEXT NOT NULL,
    setup_size INTEGER NOT NULL,
    signature TEXT NOT NULL,
    published_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS release_downloads (
    release_id INTEGER PRIMARY KEY,
    updater_download_count INTEGER NOT NULL DEFAULT 0,
    setup_download_count INTEGER NOT NULL DEFAULT 0,
    last_downloaded_at TEXT NOT NULL DEFAULT '',
    FOREIGN KEY(release_id) REFERENCES releases(id) ON DELETE CASCADE
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
