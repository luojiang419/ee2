# 进度快照 053 — 后端 latest 自愈与手动重建入口

> 日期: 2026-05-21

---

## 已完成内容

### 1. 后端现在会基于数据库当前 release 自动重写 `latest.json`

- 修改文件：
  - `更新器/update_backend_mg/app/service.py`
  - `更新器/update_backend_mg/app/main.py`
- 新行为：
  - `GET /api/update/v1/channels/{channel}/latest`
  - `GET /updates/{channel}/latest.json`
  - 两个入口现在都会先根据数据库中的 `channels.current_release_id` 调用重建逻辑
  - 这样部署新后端后，即使磁盘上还留着旧的错误 `latest.json`，第一次访问时也会按新规则自动修正

### 2. 已新增手动止血入口

- 新接口：
  - `POST /api/update/v1/channels/{channel}/latest/rebuild`
- 作用：
  - 通过 Basic Auth 调用后，立即按数据库当前 release 重建指定频道的 `latest.json`
  - 适合线上紧急止血、部署后人工确认、或切换 current release 后立即刷新静态清单

### 3. 已验证“旧坏 latest 可被自动纠正”

- 使用临时 `storage + sqlite` 环境，导入当前线上 `1.0.1` 的 launcher/game 包
- 人工把临时 `latest.json` 污染成“错误包含 launcher 包”
- 再调用：
  - `ensure_latest_payload_current()`
  - `rebuild_channel_latest()`
- 验证结果：
  - 返回 payload 仅保留 `packages.game`
  - `latest.json` 文件内容也被同步重写为仅保留 `packages.game`

### 4. 文档已同步

- `更新器/update_backend_mg/README.md`
- 已补充说明：
  - delete-only launcher 包不会再被对客户端宣告
  - latest 接口与静态 latest 文件会自动自愈
  - 新增手动 rebuild 接口可用于立即止血

---

## 当前修改到的模块

- `更新器/update_backend_mg/app/service.py`
- `更新器/update_backend_mg/app/main.py`
- `更新器/update_backend_mg/README.md`

---

## 待办清单

- [ ] 将新的 `update_backend_mg` 代码部署到 3010
- [ ] 部署后请求一次：
  - `GET /api/update/v1/channels/stable/latest`
  - 或 `POST /api/update/v1/channels/stable/latest/rebuild`
  触发线上 `stable/latest.json` 自愈
- [ ] 在 Windows 真机上重新打开启动器，确认当前 `1.0.1` 不再先走 launcher 强更

---

## 下一步

- 优先部署后端新代码到 3010
- 然后立刻请求一次 `stable` 的 latest/rebuild 接口
- 最后用真实启动器验证：当前客户端面对 `1.0.1` 时应只更新 `game` 包，不再执行错误的 delete-only launcher 包
