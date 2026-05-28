from __future__ import annotations

import argparse
import io
import posixpath
import shlex
import tarfile
from datetime import datetime, timezone
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


def shell_quote(value: str) -> str:
    return shlex.quote(value)


def run_remote_command(client: paramiko.SSHClient, command: str, *, timeout: int) -> str:
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    output = stdout.read().decode("utf-8", "ignore").strip()
    error = stderr.read().decode("utf-8", "ignore").strip()
    if exit_code != 0:
        raise RuntimeError(f"Remote command failed: {command}\n{error or output}")
    return output


def remote_path_exists(client: paramiko.SSHClient, remote_path: str) -> bool:
    output = run_remote_command(
        client,
        f"if [ -e {shell_quote(remote_path)} ]; then echo 1; else echo 0; fi",
        timeout=30,
    )
    return output.strip() == "1"


def should_import_legacy(*, has_existing_db: bool, has_existing_storage: bool, legacy_source: str) -> bool:
    return bool(legacy_source.strip()) and not (has_existing_db or has_existing_storage)


def main() -> None:
    parser = argparse.ArgumentParser(description="部署 EE2X 远航版更新后端到远端 3014")
    parser.add_argument("--host", required=True)
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--remote-root", default="/opt/ee2/ee2x-new-update/game-backend")
    parser.add_argument("--backup-root", default="/opt/ee2/ee2x-new-update/backups")
    parser.add_argument("--static-base-url", default="http://115.231.35.105:3014")
    parser.add_argument("--legacy-source", default="")
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
        remote_archive = "/tmp/ee2x_update_backend_yh.tar.gz"
        with sftp.file(remote_archive, "w") as handle:
            handle.write(archive_bytes)

        remote_root = args.remote_root.rstrip("/")
        remote_parent = posixpath.dirname(remote_root)
        staging_root = posixpath.join(remote_parent, "update_backend_yh")
        remote_root_q = shell_quote(remote_root)
        backup_stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        backup_dir = posixpath.join(
            args.backup_root.rstrip("/"),
            f"ee2x-update-yh-{backup_stamp}",
        )

        db_dir = f"{remote_root}/db"
        storage_dir = f"{remote_root}/storage"
        env_path = f"{remote_root}/.env"
        service_path = "/etc/systemd/system/ee2x-update-yh.service"
        backup_db_dir = f"{backup_dir}/db"
        backup_storage_dir = f"{backup_dir}/storage"
        backup_env_path = f"{backup_dir}/.env"
        backup_service_path = f"{backup_dir}/ee2x-update-yh.service"

        has_existing_db = remote_path_exists(client, db_dir)
        has_existing_storage = remote_path_exists(client, storage_dir)
        has_existing_env = remote_path_exists(client, env_path)
        has_existing_service = remote_path_exists(client, service_path)
        should_run_legacy_import = should_import_legacy(
            has_existing_db=has_existing_db,
            has_existing_storage=has_existing_storage,
            legacy_source=args.legacy_source,
        )

        env_content = "\n".join(
            [
                "EE2X_YH_UPDATE_HOST=0.0.0.0",
                "EE2X_YH_UPDATE_PORT=3014",
                "EE2X_YH_UPDATE_DEFAULT_CHANNEL=stable",
                f"EE2X_YH_UPDATE_ADMIN_USERNAME={args.admin_username.strip() or 'ee2x'}",
                f"EE2X_YH_UPDATE_ADMIN_PASSWORD={args.admin_password or 'ee2x'}",
                f"EE2X_YH_UPDATE_STATIC_BASE_URL={args.static_base_url}",
                f"EE2X_YH_UPDATE_STORAGE_UPDATES_DIR={args.remote_root}/storage/updates",
                f"EE2X_YH_UPDATE_STORAGE_TMP_DIR={args.remote_root}/storage/tmp",
                f"EE2X_YH_UPDATE_DB_PATH={args.remote_root}/db/update_service.sqlite3",
                f"EE2X_YH_UPDATE_LEGACY_SOURCE={args.legacy_source.strip()}",
                "",
            ]
        )

        backup_commands = [
            f"mkdir -p {shell_quote(backup_dir)}",
        ]
        if has_existing_db:
            backup_commands.append(
                f"rm -rf {shell_quote(backup_db_dir)} && cp -a {shell_quote(db_dir)} {shell_quote(backup_db_dir)}"
            )
        if has_existing_storage:
            backup_commands.append(
                f"rm -rf {shell_quote(backup_storage_dir)} && cp -a {shell_quote(storage_dir)} {shell_quote(backup_storage_dir)}"
            )
        if has_existing_env:
            backup_commands.append(
                f"cp -a {shell_quote(env_path)} {shell_quote(backup_env_path)}"
            )
        if has_existing_service:
            backup_commands.append(
                f"cp -a {shell_quote(service_path)} {shell_quote(backup_service_path)}"
            )
        for command in backup_commands:
            run_remote_command(client, command, timeout=240)

        deploy_commands = [
            f"rm -rf {shell_quote(staging_root)}",
            f"mkdir -p {shell_quote(remote_parent)}",
            f"tar -xzf {shell_quote(remote_archive)} -C {shell_quote(remote_parent)}",
            f"rm -rf {shell_quote(remote_root)}",
            f"mv {shell_quote(staging_root)} {shell_quote(remote_root)}",
        ]
        for command in deploy_commands:
            run_remote_command(client, command, timeout=240)

        if has_existing_db:
            run_remote_command(
                client,
                f"rm -rf {shell_quote(db_dir)} && cp -a {shell_quote(backup_db_dir)} {shell_quote(db_dir)}",
                timeout=240,
            )
        if has_existing_storage:
            run_remote_command(
                client,
                f"rm -rf {shell_quote(storage_dir)} && cp -a {shell_quote(backup_storage_dir)} {shell_quote(storage_dir)}",
                timeout=240,
            )

        if has_existing_env:
            run_remote_command(
                client,
                f"cp -a {shell_quote(backup_env_path)} {shell_quote(env_path)}",
                timeout=120,
            )
        else:
            write_remote_file(sftp, env_path, env_content)

        write_remote_file(
            sftp,
            service_path,
            (source_dir / "systemd" / "ee2x-update-yh.service").read_text(encoding="utf-8"),
        )

        install_commands = [
            f"python3 -m venv {remote_root_q}/.venv",
            f"{remote_root_q}/.venv/bin/pip install --upgrade pip",
            f"{remote_root_q}/.venv/bin/pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r {remote_root_q}/requirements.txt",
        ]
        for command in install_commands:
            run_remote_command(client, command, timeout=300)

        post_commands = [
            "systemctl daemon-reload",
            "systemctl enable ee2x-update-yh.service",
            "systemctl restart ee2x-update-yh.service",
            "systemctl is-active ee2x-update-yh.service",
        ]
        if should_run_legacy_import:
            post_commands.insert(
                0,
                f"cd {shell_quote(remote_root)} && ./.venv/bin/python -m app.import_legacy --source {shell_quote(args.legacy_source)}",
            )
        for command in post_commands:
            run_remote_command(client, command, timeout=300)

        print(f"ADMIN_USERNAME={args.admin_username.strip() or 'ee2x'}")
        print(f"ADMIN_PASSWORD={args.admin_password or 'ee2x'}")
        print(f"BACKEND_BASE_URL={args.static_base_url}")
        print(f"BACKUP_DIR={backup_dir}")
        print(f"IMPORTED_LEGACY={'1' if should_run_legacy_import else '0'}")
    finally:
        client.close()


if __name__ == "__main__":
    main()
