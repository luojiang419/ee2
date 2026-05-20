from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from ee2x_update_suite.shared.manifest_builder import create_release_bundle

from .service import load_publish_config, publish_release


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="EE2X 发布与更新器端到端烟雾测试")
    parser.add_argument("--config", required=True, help="publish.local.json 路径")
    parser.add_argument("--channel", required=True, help="测试频道名")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config_path = Path(args.config).resolve()
    config = load_publish_config(config_path)

    workspace = Path(tempfile.mkdtemp(prefix="ee2x-e2e-smoke-"))
    try:
        source_root = workspace / "source" / "Empire Earth II"
        target_root = workspace / "target" / "Empire Earth II"
        launcher_dir = target_root / "地球帝国二代远航版启动器"
        launcher_exe = launcher_dir / "地球帝国二代远航版启动器.exe"
        launcher_args_file = launcher_dir / "launcher-restarted.args"

        (source_root / "smoke").mkdir(parents=True)
        (source_root / "smoke" / "hello.txt").write_text("codex smoke release\n", encoding="utf-8")
        (launcher_dir / "update").mkdir(parents=True)
        launcher_exe.write_text(
            "#!/usr/bin/env sh\n"
            f"printf '%s\\n' \"$@\" > \"{launcher_args_file}\"\n"
            "exit 0\n",
            encoding="utf-8",
        )
        launcher_exe.chmod(0o755)

        release_dir, _manifest, validation = create_release_bundle(
            game_root=source_root,
            version="codex-e2e-20260520",
            release_notes="Codex end-to-end smoke test.",
            selected_paths=[source_root / "smoke"],
            delete_list=[],
            output_root=workspace / "releases",
            allow_override=False,
        )
        if validation.has_errors:
            raise RuntimeError(validation.to_text())

        smoke_config_path = workspace / "publish-smoke.json"
        smoke_payload = {
            "sshHost": config.sshHost,
            "sshPort": config.sshPort,
            "sshUsername": config.sshUsername,
            "sshPassword": config.sshPassword,
            "sshPrivateKey": config.sshPrivateKey,
            "remoteRoot": config.remoteRoot,
            "publicBaseUrl": config.publicBaseUrl,
            "channel": args.channel,
        }
        smoke_config_path.write_text(json.dumps(smoke_payload, ensure_ascii=False, indent=2), encoding="utf-8")

        publish_result = publish_release(release_dir, smoke_config_path)

        env = dict(**subprocess.os.environ)
        env["PYTHONPATH"] = str(Path(__file__).resolve().parents[2])
        cmd = [
            "python3",
            "-m",
            "ee2x_update_suite.updater_gui",
            "--headless",
            "--root",
            str(target_root),
            "--launcher-dir",
            str(launcher_dir),
            "--launcher-exe",
            str(launcher_exe),
            "--server-base",
            config.publicBaseUrl,
            "--channel",
            args.channel,
        ]
        proc = subprocess.run(cmd, check=True, capture_output=True, text=True, env=env)
        updater_summary = json.loads(proc.stdout)

        updated_file = target_root / "smoke" / "hello.txt"
        if updated_file.read_text(encoding="utf-8").strip() != "codex smoke release":
            raise RuntimeError("更新器执行后文件内容校验失败。")
        for _ in range(30):
            if launcher_args_file.exists():
                break
            time.sleep(0.1)
        if not launcher_args_file.exists():
            raise RuntimeError("更新器执行后未成功拉起测试启动器。")

        print(
            json.dumps(
                {
                    "publish": publish_result,
                    "updater": updater_summary,
                    "updatedFile": str(updated_file),
                    "launcherRestartArgs": launcher_args_file.read_text(encoding="utf-8").strip(),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


if __name__ == "__main__":
    main()
