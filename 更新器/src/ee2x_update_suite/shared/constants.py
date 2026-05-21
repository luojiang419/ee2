from __future__ import annotations

ROOT_DIR_NAME = "Empire Earth II"
LAUNCHER_DIR_NAME = "地球帝国二代远航版启动器"
LAUNCHER_PUBLIC_DEFAULTS_DIR_NAME = "Defaults"
LAUNCHER_PUBLIC_DEFAULTS_FILE_NAME = "launcher-public.json"
PACKAGE_SCOPE_GAME = "game"
PACKAGE_SCOPE_LAUNCHER = "launcher"
PACKAGE_SCOPE_ALL = "all"
DEFAULT_CHANNEL = "stable"
SCHEMA_VERSION = 1
LATEST_FILE_NAME = "latest.json"
RELEASE_MANIFEST_NAME = "release-manifest.json"
RELEASE_NOTES_NAME = "release-notes.txt"
RELEASE_STATE_NAME = "release-state.json"
APPLY_HISTORY_NAME = "apply-history.json"
LAST_UPDATER_RESULT_NAME = "last-updater-result.json"
LAST_UPDATER_LOG_NAME = "last-updater-log.txt"
APPLY_MODE_OVERLAY = "overlay"
TEMP_SUFFIX = ".ee2x_tmp"
BUNDLE_FORMAT = "ee2x-release-bundle"
BUNDLE_VERSION = 1

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

PUBLIC_LAUNCHER_DEFAULTS_RELATIVE_PATH = f"{LAUNCHER_DIR_NAME}/{LAUNCHER_PUBLIC_DEFAULTS_DIR_NAME}/{LAUNCHER_PUBLIC_DEFAULTS_FILE_NAME}"

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
