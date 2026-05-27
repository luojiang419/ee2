from __future__ import annotations

import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from fastapi import HTTPException

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import Settings
from app.db import db_session, init_db
from app.service import (
    get_history,
    get_history_total_count,
    get_latest_payload,
    publish_release,
    release_dir,
    resolve_release_file,
)


SIGNATURE_TEXT = """untrusted comment: minisign signature 7773BDBBC1B718C1
RWR3c727wbcYweRQD4vOysA6YhYJrCSBkTegRXAL3ggmjrNpCUQDLfcImRaVtu2KL5ZvUjptd4iBCWpTV7uTpxc/lB/G00idLAI=
trusted comment: timestamp:1779859842
8QKce02F2HNk/KUKXYkIyEzNWo3IOGSO1qTgjGvOa8ZvP5efpU7KkqKwWIUlYfcHke3h5rBIJA5q/r/zbm53Dw==
"""


class SingleVersionRetentionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_dir = Path(self.temp_dir.name)
        self.storage_root = self.base_dir / "storage"
        self.releases_dir = self.storage_root / "releases"
        self.tmp_dir = self.storage_root / "tmp"
        self.db_path = self.base_dir / "db" / "launcher_update.sqlite3"
        self.releases_dir.mkdir(parents=True, exist_ok=True)
        self.tmp_dir.mkdir(parents=True, exist_ok=True)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.settings = Settings(
            base_dir=self.base_dir,
            host="127.0.0.1",
            port=3011,
            admin_username="ee2x",
            admin_password="ee2x",
            static_base_url="http://127.0.0.1:3011",
            storage_root=self.storage_root,
            releases_dir=self.releases_dir,
            tmp_dir=self.tmp_dir,
            db_path=self.db_path,
        )
        init_db(self.db_path)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def create_artifacts(self, version: str) -> tuple[Path, Path]:
        artifact_dir = self.base_dir / "artifacts" / version
        artifact_dir.mkdir(parents=True, exist_ok=True)
        setup_path = artifact_dir / f"{version}-setup.exe"
        updater_path = artifact_dir / f"{version}-updater.nsis.zip"
        setup_path.write_bytes(f"setup-{version}".encode("utf-8"))
        updater_path.write_bytes(f"updater-{version}".encode("utf-8"))
        return setup_path, updater_path

    def publish(self, version: str) -> dict[str, object]:
        setup_path, updater_path = self.create_artifacts(version)
        return publish_release(
            self.settings,
            version=version,
            notes=f"release {version}",
            setup_path=setup_path,
            updater_path=updater_path,
            signature_text=SIGNATURE_TEXT,
        )

    def read_history(self) -> tuple[int, list[dict[str, object]]]:
        with db_session(self.db_path) as conn:
            return get_history_total_count(conn), get_history(self.settings, conn, 0)

    def test_first_publish_keeps_only_current_version(self) -> None:
        self.publish("1.0.0")

        total, items = self.read_history()
        self.assertEqual(total, 1)
        self.assertEqual([item["version"] for item in items], ["1.0.0"])
        self.assertTrue(release_dir(self.settings, "1.0.0").exists())

        with db_session(self.db_path) as conn:
            payload = get_latest_payload(self.settings, conn)
        self.assertEqual(payload["version"], "1.0.0")

    def test_second_publish_replaces_old_version_and_old_download_404(self) -> None:
        self.publish("1.0.0")
        self.publish("1.0.1")

        total, items = self.read_history()
        self.assertEqual(total, 1)
        self.assertEqual([item["version"] for item in items], ["1.0.1"])
        self.assertFalse(release_dir(self.settings, "1.0.0").exists())
        self.assertTrue(release_dir(self.settings, "1.0.1").exists())

        with db_session(self.db_path) as conn:
            with self.assertRaises(HTTPException) as error:
                resolve_release_file(
                    self.settings,
                    conn,
                    version="1.0.0",
                    kind="setup",
                )
        self.assertEqual(error.exception.status_code, 404)

    def test_multiple_publishes_still_leave_one_latest_version(self) -> None:
        self.publish("1.0.0")
        self.publish("1.0.1")
        self.publish("1.0.2")

        total, items = self.read_history()
        self.assertEqual(total, 1)
        self.assertEqual([item["version"] for item in items], ["1.0.2"])
        self.assertEqual(
            sorted(path.name for path in self.releases_dir.iterdir() if path.is_dir()),
            ["1.0.2"],
        )

    def test_cleanup_failure_rolls_back_to_previous_latest(self) -> None:
        self.publish("1.0.0")
        setup_path, updater_path = self.create_artifacts("1.0.1")
        real_rmtree = shutil.rmtree
        old_release_dir = release_dir(self.settings, "1.0.0")

        def guarded_rmtree(path: str | Path, *args, **kwargs):
            target = Path(path)
            if target == old_release_dir and not kwargs.get("ignore_errors", False):
                raise OSError("cannot delete old release")
            return real_rmtree(path, *args, **kwargs)

        with mock.patch("app.service.shutil.rmtree", side_effect=guarded_rmtree):
            with self.assertRaises(OSError):
                publish_release(
                    self.settings,
                    version="1.0.1",
                    notes="release 1.0.1",
                    setup_path=setup_path,
                    updater_path=updater_path,
                    signature_text=SIGNATURE_TEXT,
                )

        total, items = self.read_history()
        self.assertEqual(total, 1)
        self.assertEqual([item["version"] for item in items], ["1.0.0"])
        self.assertTrue(old_release_dir.exists())
        self.assertFalse(release_dir(self.settings, "1.0.1").exists())


if __name__ == "__main__":
    unittest.main()
