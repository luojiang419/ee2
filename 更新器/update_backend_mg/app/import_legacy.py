from __future__ import annotations

import argparse
from pathlib import Path

from .config import load_settings
from .db import init_db
from .service import import_legacy_updates, rebuild_index_from_storage


def main() -> None:
    parser = argparse.ArgumentParser(description="导入旧 1234 更新目录到新后端存储")
    parser.add_argument("--source", default="", help="旧更新目录，默认读取 .env 中的 EE2X_UPDATE_LEGACY_SOURCE")
    parser.add_argument("--rebuild-only", action="store_true", help="不复制文件，只从当前 storage/updates 重建 SQLite 索引")
    args = parser.parse_args()

    settings = load_settings()
    init_db(settings.db_path)
    if args.rebuild_only:
        rebuild_index_from_storage(settings)
        print("rebuild-index-done")
        return

    import_legacy_updates(settings, None if not args.source.strip() else Path(args.source).resolve())
    print("import-legacy-done")


if __name__ == "__main__":
    main()
