from __future__ import annotations

import argparse
from datetime import datetime, timezone
import io
from pathlib import Path
import posixpath
import tarfile

import paramiko


LOCAL_ROOT = Path(__file__).resolve().parent


def build_archive() -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for path in sorted(LOCAL_ROOT.rglob("*")):
            relative = path.relative_to(LOCAL_ROOT)
            if any(part in {"__pycache__", ".venv", ".pytest_cache"} for part in relative.parts):
                continue
            if path.name.endswith((".pyc", ".pyo")):
                continue
            archive.add(path, arcname=str(relative))
    buffer.seek(0)
    return buffer.read()


def run_remote(client: paramiko.SSHClient, command: str) -> str:
    stdin, stdout, stderr = client.exec_command(command)
    del stdin
    output = stdout.read().decode("utf-8", "replace")
    error = stderr.read().decode("utf-8", "replace")
    status = stdout.channel.recv_exit_status()
    if status != 0:
        raise RuntimeError(f"remote command failed ({status}): {command}\n{output}\n{error}")
    return output


def put_text(sftp: paramiko.SFTPClient, remote_path: str, content: str) -> None:
    with sftp.file(remote_path, "w") as handle:
        handle.write(content)


def main() -> None:
    parser = argparse.ArgumentParser(description="Deploy launcher installer update backend")
    parser.add_argument("--host", default="115.231.35.105")
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--username", default="root")
    parser.add_argument("--password", required=True)
    parser.add_argument("--remote-root", default="/opt/ee2x/ee2x_lunch-update")
    parser.add_argument("--service-name", default="ee2x-launcher-update.service")
    parser.add_argument("--app-port", type=int, default=3011)
    parser.add_argument("--static-base-url", default="http://115.231.35.105:3011")
    args = parser.parse_args()

    archive_bytes = build_archive()
    remote_parent = posixpath.dirname(args.remote_root.rstrip("/"))
    remote_archive = "/tmp/ee2x_launcher_update_backend.tar.gz"
    staging_root = posixpath.join(remote_parent, "ee2x_launcher_update_backend_staging")
    backup_root = posixpath.join(remote_parent, "backups")
    backup_stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    backup_dir = posixpath.join(backup_root, f"ee2x-launcher-update-{backup_stamp}")
    service_path = f"/etc/systemd/system/{args.service_name}"

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        args.host,
        port=args.port,
        username=args.username,
        password=args.password,
        timeout=15,
    )

    try:
        sftp = client.open_sftp()
        try:
            with sftp.file(remote_archive, "wb") as handle:
                handle.write(archive_bytes)
        finally:
            sftp.close()

        run_remote(client, f"mkdir -p {backup_root}")
        run_remote(
            client,
            " && ".join(
                [
                    f"rm -rf {staging_root}",
                    f"mkdir -p {staging_root}",
                    f"tar -xzf {remote_archive} -C {staging_root}",
                    f"mkdir -p {args.remote_root}",
                    (
                        f"if [ -d {args.remote_root} ]; then "
                        f"mkdir -p {backup_dir}; "
                        f"for item in app systemd requirements.txt README.md deploy_backend.py .env .env.example db storage; do "
                        f"if [ -e {args.remote_root}/$item ]; then cp -a {args.remote_root}/$item {backup_dir}/; fi; "
                        f"done; "
                        f"if [ -f {service_path} ]; then cp -a {service_path} {backup_dir}/; fi; "
                        f"fi"
                    ),
                    (
                        f"rm -rf {args.remote_root}/app {args.remote_root}/systemd "
                        f"{args.remote_root}/requirements.txt {args.remote_root}/README.md "
                        f"{args.remote_root}/deploy_backend.py {args.remote_root}/.env.example"
                    ),
                    f"cp -a {staging_root}/. {args.remote_root}/",
                    f"mkdir -p {args.remote_root}/storage/releases {args.remote_root}/storage/tmp {args.remote_root}/db",
                    f"python3 -m venv {args.remote_root}/.venv",
                    (
                        f"{args.remote_root}/.venv/bin/pip install --upgrade pip --disable-pip-version-check --quiet "
                        f"> {args.remote_root}/pip-bootstrap.log 2>&1 "
                        f"|| (cat {args.remote_root}/pip-bootstrap.log && exit 1)"
                    ),
                    (
                        f"{args.remote_root}/.venv/bin/pip install --disable-pip-version-check --quiet "
                        f"-r {args.remote_root}/requirements.txt "
                        f"> {args.remote_root}/pip-install.log 2>&1 "
                        f"|| (cat {args.remote_root}/pip-install.log && exit 1)"
                    ),
                ]
            ),
        )

        default_env = "\n".join(
            [
                "EE2X_LAUNCHER_UPDATE_HOST=0.0.0.0",
                f"EE2X_LAUNCHER_UPDATE_PORT={args.app_port}",
                "EE2X_LAUNCHER_UPDATE_ADMIN_USERNAME=ee2x",
                "EE2X_LAUNCHER_UPDATE_ADMIN_PASSWORD=ee2x",
                f"EE2X_LAUNCHER_UPDATE_STATIC_BASE_URL={args.static_base_url}",
                f"EE2X_LAUNCHER_UPDATE_STORAGE_ROOT={args.remote_root}/storage",
                f"EE2X_LAUNCHER_UPDATE_DB_PATH={args.remote_root}/db/launcher_update.sqlite3",
                "",
            ]
        )

        sftp = client.open_sftp()
        try:
            env_path = f"{args.remote_root}/.env"
            try:
                sftp.stat(env_path)
            except FileNotFoundError:
                put_text(sftp, env_path, default_env)

            service_template = (LOCAL_ROOT / "systemd" / "ee2x-launcher-update.service").read_text(
                encoding="utf-8"
            )
            rendered_service = (
                service_template.replace("__WORKDIR__", args.remote_root).replace(
                    "__PORT__", str(args.app_port)
                )
            )
            put_text(sftp, service_path, rendered_service)
        finally:
            sftp.close()

        run_remote(
            client,
            " && ".join(
                [
                    "systemctl daemon-reload",
                    f"systemctl enable {args.service_name}",
                    f"systemctl restart {args.service_name}",
                    f"systemctl is-active {args.service_name}",
                    (
                        f"for i in 1 2 3 4 5; do "
                        f"curl -fsS http://127.0.0.1:{args.app_port}/api/launcher-update/v1/health "
                        f"&& break || sleep 1; "
                        f"done"
                    ),
                    f"rm -rf {staging_root}",
                    f"rm -f {remote_archive}",
                ]
            ),
        )
        print(f"部署完成: http://{args.host}:{args.app_port}/api/launcher-update/v1/health")
    finally:
        client.close()


if __name__ == "__main__":
    main()
