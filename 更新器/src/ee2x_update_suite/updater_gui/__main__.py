from __future__ import annotations

import argparse
import json
from pathlib import Path

from ee2x_update_suite.shared.constants import PACKAGE_SCOPE_GAME, PACKAGE_SCOPE_LAUNCHER
from ee2x_update_suite.updater_gui.runner import run_update_from_args


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="EE2X 外部更新器")
    parser.add_argument("--root", required=True, help="Empire Earth II 根目录")
    parser.add_argument("--launcher-dir", default="", help="启动器目录")
    parser.add_argument("--launcher-exe", default="", help="启动器 EXE 路径")
    parser.add_argument("--server-base", required=True, help="静态更新服务器基址")
    parser.add_argument("--channel", default="stable", help="更新频道")
    parser.add_argument(
        "--scope",
        default=PACKAGE_SCOPE_GAME,
        choices=[PACKAGE_SCOPE_GAME, PACKAGE_SCOPE_LAUNCHER],
        help="本次应用的发布包范围",
    )
    parser.add_argument("--headless", action="store_true", help="无界面执行更新并输出 JSON 结果")
    parser.add_argument("--result-file", default="", help="headless 模式下写入结果 JSON 的路径")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.headless:
        try:
            summary = run_update_from_args(args)
            payload = {"ok": True, "summary": summary.to_dict()}
            if args.result_file:
                Path(args.result_file).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            return
        except Exception as exc:
            payload = {"ok": False, "error": str(exc), "errorType": type(exc).__name__}
            if args.result_file:
                Path(args.result_file).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            raise
    import tkinter as tk

    from ee2x_update_suite.updater_gui.app import UpdaterWindow

    root = tk.Tk()
    UpdaterWindow(root, args)
    root.mainloop()


if __name__ == "__main__":
    main()
