from __future__ import annotations

import argparse
from pathlib import Path

from ee2x_update_suite.shared.constants import LAUNCHER_DIR_NAME, PACKAGE_SCOPE_ALL

from .core import run_patcher


def run_patcher_from_args(args: argparse.Namespace, progress=None):
    game_root = Path(args.root).resolve()
    launcher_dir = Path(args.launcher_dir).resolve() if args.launcher_dir else game_root / LAUNCHER_DIR_NAME
    launcher_exe = Path(args.launcher_exe).resolve() if args.launcher_exe else launcher_dir / f"{LAUNCHER_DIR_NAME}.exe"
    result_file = Path(args.result_file).resolve() if str(getattr(args, "result_file", "") or "").strip() else None
    log_file = Path(args.log_file).resolve() if str(getattr(args, "log_file", "") or "").strip() else None
    return run_patcher(
        game_root=game_root,
        launcher_dir=launcher_dir,
        server_base=args.server_base,
        channel=args.channel,
        launcher_exe=launcher_exe,
        scope=str(getattr(args, "scope", PACKAGE_SCOPE_ALL) or PACKAGE_SCOPE_ALL),
        result_file=result_file,
        log_file=log_file,
        progress=progress,
    )

