from __future__ import annotations

ROOT_DIR_NAME = "Empire Earth II"
LAUNCHER_DIR_NAME = "地球帝国二代远航版启动器"
DEFAULT_CHANNEL = "stable"
SCHEMA_VERSION = 1
LATEST_FILE_NAME = "latest.json"
RELEASE_MANIFEST_NAME = "release-manifest.json"
RELEASE_NOTES_NAME = "release-notes.txt"
RELEASE_STATE_NAME = "release-state.json"
APPLY_HISTORY_NAME = "apply-history.json"
APPLY_MODE_OVERLAY = "overlay"
TEMP_SUFFIX = ".ee2x_tmp"

PROTECTED_RELATIVE_PATHS = [
    f"{LAUNCHER_DIR_NAME}/Config",
    f"{LAUNCHER_DIR_NAME}/Logs",
    f"{LAUNCHER_DIR_NAME}/data/userdata",
    f"{LAUNCHER_DIR_NAME}/data/game-csv",
    f"{LAUNCHER_DIR_NAME}/data/Settlement-img",
    f"{LAUNCHER_DIR_NAME}/update/runtime",
    f"{LAUNCHER_DIR_NAME}/update/ee2x-up.exe",
]

BLOCKED_SELECTION_PREFIXES = [
    f"{LAUNCHER_DIR_NAME}/Config",
    f"{LAUNCHER_DIR_NAME}/Logs",
    f"{LAUNCHER_DIR_NAME}/data/userdata",
    f"{LAUNCHER_DIR_NAME}/data/game-csv",
    f"{LAUNCHER_DIR_NAME}/data/Settlement-img",
    f"{LAUNCHER_DIR_NAME}/update/runtime",
]

SENSITIVE_SYNC_PATTERNS = [
    "EE2X_db/Text/dbtext_enums*.utf8",
    "EE2X_db/Text/dbtext_cheats.utf8",
    "zips/dbtext_cheats.utf8",
    "Unofficial Patch Files/EXEGeneratorData/TextsSource.txt",
]

MIXED_DATABASE_RULE = {
    "loosePrefix": "EE2X_db",
    "zipPath": "zips_ee2x/EE2X_db.zip",
}
