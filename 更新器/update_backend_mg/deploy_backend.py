from __future__ import annotations

import argparse
import io
import os
import posixpath
import tarfile
import tempfile
from pathlib import Path

import paramiko


def create_archive(source_dir: Path) -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for path in source_dir.rglob("*"):
            relative = path.relative_to(source_dir.parent)
            if any(part in {"__pycache__", ".venv"} for part in path.parts):
                continue
            archive.add(path, arcname=str(relative))
    buffer.seek(0)
    return buffer.read()


def write_remote_file(sftp, remote_path: str, content: str) -> None:
    with sftp.file(remote_path, "w") as handle:
        handle.write(content.encode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="部署 EE2X 新更新后端到远端 3010")
    parser.add_argument("--host", required=True)
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--remote-root", default="/root/ee2x/ee2x_up-mg")
    parser.add_argument("--static-base-url", default="http://115.231.35.105:3010")
    parser.add_argument("--legacy-source", default="/opt/ee2x_up-xg/updates")
    parser.add_argument("--admin-username", default="ee2x", help="Web/API 管理账号")
    parser.add_argument("--admin-password", default="ee2x", help="Web/API 管理密码")
    args = parser.parse_args()

    source_dir = Path(__file__).resolve().parent
    archive_bytes = create_archive(source_dir)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=args.host,
        port=args.port,
        username=args.username,
        password=args.password,
        timeout=20,
    )
    try:
        sftp = client.open_sftp()
        remote_archive = "/tmp/ee2x_update_backend_mg.tar.gz"
        with sftp.file(remote_archive, "w") as handle:
            handle.write(archive_bytes)

        env_content = "\n".join(
            [
                "EE2X_UPDATE_HOST=0.0.0.0",
                "EE2X_UPDATE_PORT=3010",
                "EE2X_UPDATE_DEFAULT_CHANNEL=stable",
                f"EE2X_UPDATE_ADMIN_USERNAME={args.admin_username.strip() or 'ee2x'}",
                f"EE2X_UPDATE_ADMIN_PASSWORD={args.admin_password or 'ee2x'}",
                f"EE2X_UPDATE_STATIC_BASE_URL={args.static_base_url}",
                f"EE2X_UPDATE_STORAGE_UPDATES_DIR={args.remote_root}/storage/updates",
                f"EE2X_UPDATE_STORAGE_TMP_DIR={args.remote_root}/storage/tmp",
                f"EE2X_UPDATE_DB_PATH={args.remote_root}/db/update_service.sqlite3",
                f"EE2X_UPDATE_LEGACY_SOURCE={args.legacy_source}",
                "",
            ]
        )

        commands = [
            f"rm -rf {args.remote_root}",
            f"rm -rf {posixpath.dirname(args.remote_root)}/update_backend_mg",
            f"mkdir -p {posixpath.dirname(args.remote_root)}",
            f"tar -xzf {remote_archive} -C {posixpath.dirname(args.remote_root)}",
            f"mv {posixpath.dirname(args.remote_root)}/update_backend_mg {args.remote_root}",
            f"python3 -m venv {args.remote_root}/.venv",
            f"{args.remote_root}/.venv/bin/pip install --upgrade pip",
            f"{args.remote_root}/.venv/bin/pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r {args.remote_root}/requirements.txt",
        ]
        for command in commands:
            stdin, stdout, stderr = client.exec_command(command, timeout=240)
            exit_code = stdout.channel.recv_exit_status()
            if exit_code != 0:
                raise RuntimeError(f"Remote command failed: {command}\n{stderr.read().decode('utf-8', 'ignore')}")

        write_remote_file(sftp, f"{args.remote_root}/.env", env_content)

        write_remote_file(
            sftp,
            "/etc/systemd/system/ee2x-update-mg.service",
            (source_dir / "systemd" / "ee2x-update-mg.service").read_text(encoding="utf-8"),
        )

        post_commands = [
            f"cd {args.remote_root} && ./.venv/bin/python -m app.import_legacy --source {args.legacy_source}",
            "systemctl daemon-reload",
            "systemctl enable ee2x-update-mg.service",
            "systemctl restart ee2x-update-mg.service",
            "systemctl is-active ee2x-update-mg.service",
        ]
        for command in post_commands:
            stdin, stdout, stderr = client.exec_command(command, timeout=300)
            exit_code = stdout.channel.recv_exit_status()
            output = stdout.read().decode("utf-8", "ignore").strip()
            error = stderr.read().decode("utf-8", "ignore").strip()
            if exit_code != 0:
                raise RuntimeError(f"Remote command failed: {command}\n{error or output}")

        print(f"ADMIN_USERNAME={args.admin_username.strip() or 'ee2x'}")
        print(f"ADMIN_PASSWORD={args.admin_password or 'ee2x'}")
        print(f"BACKEND_BASE_URL={args.static_base_url}")
    finally:
        client.close()


if __name__ == "__main__":
    main()
