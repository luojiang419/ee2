from __future__ import annotations

import argparse
import json

from .runner import run_update_from_args


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="EE2X 外部更新器")
    parser.add_argument("--root", required=True, help="Empire Earth II 根目录")
    parser.add_argument("--launcher-dir", default="", help="启动器目录")
    parser.add_argument("--launcher-exe", default="", help="启动器 EXE 路径")
    parser.add_argument("--server-base", required=True, help="静态更新服务器基址")
    parser.add_argument("--channel", default="stable", help="更新频道")
    parser.add_argument("--headless", action="store_true", help="无界面执行更新并输出 JSON 结果")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.headless:
        summary = run_update_from_args(args)
        print(json.dumps(summary.to_dict(), ensure_ascii=False, indent=2))
        return
    import tkinter as tk

    from .app import UpdaterWindow

    root = tk.Tk()
    UpdaterWindow(root, args)
    root.mainloop()


if __name__ == "__main__":
    main()
