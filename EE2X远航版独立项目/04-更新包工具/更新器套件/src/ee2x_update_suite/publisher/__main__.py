from __future__ import annotations

import argparse
from pathlib import Path

from ee2x_update_suite.publisher.service import publish_release


def main() -> None:
    parser = argparse.ArgumentParser(description="推送 EE2X 静态发布目录")
    parser.add_argument("release_dir", help="本地发布目录")
    parser.add_argument("--config", required=True, help="发布配置 JSON")
    args = parser.parse_args()

    result = publish_release(Path(args.release_dir), Path(args.config))
    for key, value in result.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
