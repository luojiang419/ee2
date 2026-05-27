# EE2X 启动器安装包更新后端

独立提供新版启动器安装包自更新能力，不与现有 `3010` 游戏更新后端共用数据或接口。

## 默认部署

- 目录：`/opt/ee2x/ee2x_lunch-update`
- 端口：`3011`
- 服务：`ee2x-launcher-update.service`

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
cd 更新器/launcher_update_backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env
./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3011
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

## 一键部署

本地执行：

```bash
python3 更新器/launcher_update_backend/deploy_backend.py \
  --host 115.231.35.105 \
  --username root \
  --password 'lhsgEMCF0380'
```
