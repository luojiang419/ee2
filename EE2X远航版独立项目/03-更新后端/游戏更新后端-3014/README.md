# EE2X 远航版更新后端

本目录是替换旧 `1234` 更新服务的新后端源码，目标是统一服务：

- Flutter 推送工具 HTTP 发布
- 启动器版本检查 / 更新历史
- 外部更新器静态下载

## 本地结构

- `app/main.py`：FastAPI 入口
- `app/service.py`：发布、历史、latest、导入逻辑
- `app/import_legacy.py`：按需导入旧更新目录并重建索引
- `requirements.txt`：后端依赖
- `systemd/ee2x-update-yh.service`：远端服务单元文件
- `deploy_backend.py`：本地一键部署脚本

## 远端目标

- 目录：`/opt/ee2/ee2x-new-update/game-backend`
- 端口：`3014`
- 基址：`http://115.231.35.105:3014`

## 接口

- `POST /api/update/v1/auth/login`
- `GET /api/update/v1/health`
- `GET /api/update/v1/channels/{channel}/latest`
- `GET /api/update/v1/channels/{channel}/history?limit=0`
- `POST /api/update/v1/releases/publish`
- `POST /api/update/v1/releases/publish-bundle`
- `DELETE /api/update/v1/channels/{channel}/releases/{releaseId}`
- `POST /api/update/v1/channels/{channel}/latest/rebuild`
- `GET /updates/{channel}/latest.json`

补充约定：

- `latest.json` 的兼容字段始终指向 `game` 包。
- `packages.launcher` 仅在 launcher manifest 存在实际 launcher 文件时下发；空包或仅删除项的 delete-only launcher 包都不会再对客户端宣告。
- 服务端不再根据“上一版有、这次没选”自动推断 `deleteList`；未勾选文件默认保持不变。
- `GET /api/update/v1/channels/{channel}/latest` 与 `GET /updates/{channel}/latest.json` 会基于数据库当前 release 自动重写静态 `latest.json`，部署新后端后可自动纠正旧的错误宣告。
- 如需人工立刻止血，可调用 `POST /api/update/v1/channels/{channel}/latest/rebuild` 强制按当前数据库状态重建该频道的 `latest.json`。
- `history` 接口在 `limit=0` 时返回当前频道全部历史版本，并额外包含下载量、包体大小、最后下载时间等详情字段。
- 更新包下载入口由后端显式路由提供，服务端会按 `launcher/game` 包自动累计下载次数。
- `deploy_backend.py` 默认会先备份远端现有 `db/`、`storage/`、`.env` 与 service 文件，再替换代码并恢复现有数据。
- 远航版默认**不导入**旧更新历史；只有显式传入 `--legacy-source` 且目标目录是首次部署时，才会执行 `import_legacy`。

## 远航版历史链说明

- 远航版 `stable` 生产链当前只保留以下 5 个版本：
  - `1.0.11`
  - `1.0.13`
  - `1.0.14`
  - `1.0.15`
  - `1.0.17`
- 当前对外 latest 固定为：
  - `1.0.17`
- 如需从旧 `3010` 历史中迁移远航版数据，**不能整库照搬**。
- 必须仅保留上述远航版版本链，再将 `stable` 的 current/latest 指向 `1.0.17`，否则会把魔改版后续版本错误暴露给远航版客户端。

## 鉴权

- Web 页与发布 API 统一使用 Basic Auth
- 默认账号密码：
  - `ee2x / ee2x`

## 运行

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3014
```
