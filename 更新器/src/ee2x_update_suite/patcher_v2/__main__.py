from __future__ import annotations

import argparse
import json
from pathlib import Path

from ee2x_update_suite.shared.constants import PACKAGE_SCOPE_ALL, PACKAGE_SCOPE_GAME, PACKAGE_SCOPE_LAUNCHER
from ee2x_update_suite.patcher_v2.runner import run_patcher_from_args


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="EE2X 可信新更新器")
    parser.add_argument("--root", required=True, help="Empire Earth II 根目录")
    parser.add_argument("--launcher-dir", default="", help="启动器目录")
    parser.add_argument("--launcher-exe", default="", help="启动器 EXE 路径")
    parser.add_argument("--server-base", required=True, help="静态更新服务器基址")
    parser.add_argument("--channel", default="stable", help="更新频道")
    parser.add_argument("--scope", default=PACKAGE_SCOPE_ALL, choices=[PACKAGE_SCOPE_GAME, PACKAGE_SCOPE_LAUNCHER, PACKAGE_SCOPE_ALL], help="更新范围")
    parser.add_argument("--result-file", default="", help="结果 JSON 路径")
    parser.add_argument("--log-file", default="", help="文本日志路径")
    parser.add_argument("--ready-file", default="", help="launcher 与 patcher 的握手文件")
    parser.add_argument("--headless", action="store_true", help="无界面执行")
    return parser.parse_args()


def _write_ready_file(raw_path: str) -> None:
    path_text = str(raw_path or "").strip()
    if not path_text:
        return
    path = Path(path_text).resolve()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("ready\n", encoding="utf-8")
    except Exception:
        pass


def main() -> None:
    args = parse_args()
    if args.headless:
        _write_ready_file(args.ready_file)
        try:
            summary = run_patcher_from_args(args)
            payload = {"ok": True, "summary": summary.to_dict()}
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            return
        except Exception as exc:
            payload = {"ok": False, "error": str(exc), "errorType": type(exc).__name__}
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            raise

    import tkinter as tk

    from ee2x_update_suite.patcher_v2.app import PatcherWindow

    root = tk.Tk()
    PatcherWindow(root, args)
    root.mainloop()


if __name__ == "__main__":
    main()
