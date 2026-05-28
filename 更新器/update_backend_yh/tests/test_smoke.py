from __future__ import annotations

import importlib
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.config import load_settings
from deploy_backend import should_import_legacy


class UpdateBackendSmokeTests(unittest.TestCase):
    def test_load_settings_defaults_to_3014_and_no_legacy_source(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            settings = load_settings(Path(temp_dir))

        self.assertEqual(settings.port, 3014)
        self.assertEqual(settings.static_base_url, "http://115.231.35.105:3014")
        self.assertIsNone(settings.legacy_updates_source)

    def test_should_import_legacy_requires_explicit_source(self) -> None:
        self.assertFalse(
            should_import_legacy(
                has_existing_db=False,
                has_existing_storage=False,
                legacy_source="",
            )
        )
        self.assertFalse(
            should_import_legacy(
                has_existing_db=True,
                has_existing_storage=False,
                legacy_source="/opt/legacy/updates",
            )
        )
        self.assertTrue(
            should_import_legacy(
                has_existing_db=False,
                has_existing_storage=False,
                legacy_source="/opt/legacy/updates",
            )
        )

    def test_health_reports_yuanhang_service(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            base_dir = Path(temp_dir)
            env = {
                "EE2X_YH_UPDATE_PORT": "3014",
                "EE2X_YH_UPDATE_STATIC_BASE_URL": "http://127.0.0.1:3014",
                "EE2X_YH_UPDATE_STORAGE_UPDATES_DIR": str(base_dir / "storage" / "updates"),
                "EE2X_YH_UPDATE_STORAGE_TMP_DIR": str(base_dir / "storage" / "tmp"),
                "EE2X_YH_UPDATE_DB_PATH": str(base_dir / "db" / "update_service.sqlite3"),
                "EE2X_YH_UPDATE_LEGACY_SOURCE": "",
            }
            with mock.patch.dict(os.environ, env, clear=False):
                import app.main as main_module

                main_module = importlib.reload(main_module)
                payload = main_module.health()

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["service"], "ee2x-update-yh")


if __name__ == "__main__":
    unittest.main()
