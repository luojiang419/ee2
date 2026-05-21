# EE2X 新更新后端

本目录是替换旧 `1234` 更新服务的新后端源码，目标是统一服务：

- Flutter 推送工具 HTTP 发布
- 启动器版本检查 / 更新历史
- 外部更新器静态下载

## 本地结构

- `app/main.py`：FastAPI 入口
- `app/service.py`：发布、历史、latest、导入逻辑
- `app/import_legacy.py`：从旧 `1234` 更新目录导入并重建索引
- `requirements.txt`：后端依赖
- `systemd/ee2x-update-mg.service`：远端服务单元文件
- `deploy_backend.py`：本地一键部署脚本

## 远端目标

- 目录：`/root/ee2x/ee2x_up-mg`
- 端口：`3010`
- 基址：`http://115.231.35.105:3010`

## 接口

- `POST /api/update/v1/auth/login`
- `GET /api/update/v1/health`
- `GET /api/update/v1/channels/{channel}/latest`
- `GET /api/update/v1/channels/{channel}/history?limit=0`
- `POST /api/update/v1/releases/publish`
- `POST /api/update/v1/releases/publish-bundle`
- `DELETE /api/update/v1/channels/{channel}/releases/{releaseId}`
- `GET /updates/{channel}/latest.json`

补充约定：

- `latest.json` 的兼容字段始终指向 `game` 包。
- `packages.launcher` 仅在 launcher manifest 存在实际变更时下发；空 launcher 包不会再对客户端宣告。
- `history` 接口在 `limit=0` 时返回当前频道全部历史版本，并额外包含下载量、包体大小、最后下载时间等详情字段。
- 更新包下载入口由后端显式路由提供，服务端会按 `launcher/game` 包自动累计下载次数。
- `deploy_backend.py` 默认会先备份远端现有 `db/`、`storage/`、`.env` 与 service 文件，再替换代码并恢复现有数据；只有首次部署且远端没有现有数据时才会执行 `import_legacy`。

## 鉴权

- Web 页与发布 API 统一使用 Basic Auth
- 默认账号密码：
  - `ee2x / ee2x`

## 运行

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3010
```
