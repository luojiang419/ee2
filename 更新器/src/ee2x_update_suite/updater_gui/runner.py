from __future__ import annotations

import argparse
from pathlib import Path

from ee2x_update_suite.shared.constants import LAUNCHER_DIR_NAME, PACKAGE_SCOPE_GAME
from ee2x_update_suite.shared.models import ApplySummary
from ee2x_update_suite.shared.updater_core import run_update


def run_update_from_args(
    args: argparse.Namespace,
    progress=None,
) -> ApplySummary:
    game_root = Path(args.root).resolve()
    launcher_dir = Path(args.launcher_dir).resolve() if args.launcher_dir else game_root / LAUNCHER_DIR_NAME
    launcher_exe = Path(args.launcher_exe).resolve() if args.launcher_exe else launcher_dir / f"{LAUNCHER_DIR_NAME}.exe"
    result_file = Path(args.result_file).resolve() if getattr(args, "result_file", "").strip() else None
    log_file = Path(args.log_file).resolve() if getattr(args, "log_file", "").strip() else None
    return run_update(
        game_root=game_root,
        launcher_dir=launcher_dir,
        server_base=args.server_base,
        channel=args.channel,
        launcher_exe=launcher_exe,
        progress=progress,
        scope=getattr(args, "scope", PACKAGE_SCOPE_GAME),
        result_file=result_file,
        log_file=log_file,
    )
