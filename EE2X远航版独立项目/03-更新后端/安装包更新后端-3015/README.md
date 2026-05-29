# EE2X 远航版启动器安装包更新后端

独立提供远航版启动器安装包自更新能力，不与远航版 `3014` 游戏更新后端共用数据或接口。

当前保留策略：

- 服务端**只保留最新一个**启动器安装包版本
- 上传新版本成功后，会自动删除所有旧版本的历史记录与安装包文件
- `/history` 现在用于查看当前保留版本状态，不再作为长期历史档案

## 默认部署

- 目录：`/opt/ee2/ee2x-new-update/launcher-backend`
- 端口：`3015`
- 服务：`ee2x-launcher-update-yh.service`

## 核心接口

- `GET /api/launcher-update/v1/health`
- `GET /api/launcher-update/v1/check/{target}/{arch}/{current_version}`
- `GET /api/launcher-update/v1/history?limit=0`
- `POST /api/launcher-update/v1/releases/publish`
- `DELETE /api/launcher-update/v1/releases/{version}`
- `GET /launcher-updates/latest.json`
- `GET /launcher-updates/releases/{version}/setup.exe`
- `GET /launcher-updates/releases/{version}/updater.nsis.zip`
- `GET /launcher-updates/releases/{version}/updater.nsis.zip.sig`

## 本地运行

```bash
cd 更新器/launcher_update_backend_yh
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env
./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3015
```

## 发布协议

发布接口 `POST /api/launcher-update/v1/releases/publish` 使用 `Basic Auth`，表单字段固定为：

- `version`
- `notes`
- `setupExe`
- `updaterPackage`
- `updaterSignature`

其中：

- `version` 必须是 `x.y.z` SemVer
- 只接受 `windows/x86_64`
- 上传版本必须大于当前 latest
- `updaterPackage` 必须是 `.nsis.zip`
- `updaterSignature` 必须是 Tauri signer 生成的 `.sig`
- 发布成功后，旧版本目录与数据库记录会被自动清理，只保留当前 latest

返回给 Tauri 客户端的更新 JSON 中：

- `signature` 字段会输出为 `.sig` 文件全文的 Base64 文本
- `signatureUrl` 仍可直接下载原始 `.sig` 文件

## 一键部署

本地执行：

```bash
python3 更新器/launcher_update_backend_yh/deploy_backend.py \
  --host 115.231.35.105 \
  --username root \
  --password 'lhsgEMCF0380'
```
