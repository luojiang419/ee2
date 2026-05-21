# 进度快照 052 — 启动器 delete-only 自升级止血与发布链拦截

> 日期: 2026-05-21

---

## 已完成内容

### 1. 已确认当前 `stable 1.0.1` 的真实问题不是“没有更新包”，而是 `launcher` 包发布错误

- 通过直接读取 `http://115.231.35.105:3010/updates/stable/latest.json`
- 当前 `1.0.1` 同时宣告了：
  - `packages.game`
  - `packages.launcher`
- 其中 `launcher/release-manifest.json` 为**纯删除包**：
  - `files = 0`
  - `deleteList = 8`
- 删除目标包括：
  - `Core/resources/app/main.js`
  - `Core/resources/app/preload.js`
  - `Core/resources/app/renderer/renderer.js`
  - `Core/resources/app/package.json`
  - `Defaults/launcher-public.json`
  - `update/version_history.json`

### 2. 已完成远端包沙盒验证，确认 `launcher` 会删坏客户端，`game` 可以正常落盘

- 使用远端 `1.0.0` 基线包初始化临时目录，再用现网 `1.0.1` 执行 headless 更新
- 验证结果：
  - `launcher` 更新返回成功，但实际执行为：
    - `updatedFiles = 0`
    - `deletedFiles = 7`
    - `skippedProtectedFiles = 1`
  - 删除后 `main.js / preload.js / renderer.js / package.json / launcher-public.json / version_history.json` 全部消失
  - `game` 更新返回成功，且 `zips_ee2x/EE2X_db.zip` 已从 `1660571` 字节更新为 `1087320` 字节

### 3. 已做客户端本机止血，delete-only `launcher` 包不再优先卡自升级

- 本机热修文件：
  - `Empire Earth II/地球帝国二代远航版启动器/Core/resources/app/main.js`
- 新逻辑：
  - 读取 `launcher manifest`
  - 若 `launcher` 包没有任何 `files`，即使存在 `deleteList`，也视为**不应触发 launcher 自升级**
  - 若用户仍走到 `launcher:runUpdater`，会自动降级为 `game` 更新，避免执行危险删除包

### 4. 已做发布链与后端拦截，后续不再允许这种坏包通过

- `更新器/src/ee2x_update_suite/shared/manifest_builder.py`
  - 本地导出时若 `launcher` 只有删除项、没有任何 launcher 文件，直接报错 `launcher-delete-only-package`
- `更新器/src/ee2x_update_suite/publisher/service.py`
  - `latest.json` 仅在 `launcher files > 0` 时才宣告 `packages.launcher`
- `更新器/src/ee2x_update_suite/publisher/http_backend.py`
  - 发布摘要 `launcherTriggersSelfUpdate` 改为仅由 `launcher files` 决定
- `更新器/update_backend_mg/app/service.py`
  - 服务端发布入口新增拒绝逻辑：`launcher` 只有删除项时直接 `400`
  - 服务端重写 `latest.json` 时，不再把 delete-only `launcher` 包暴露给客户端

### 5. 已完成本次验证

- `python3 -m compileall 更新器/src/ee2x_update_suite 更新器/update_backend_mg/app` 通过
- 发布摘要验证通过：
  - 当前远端 `1.0.1` 的 `launcherFileCount = 0`
  - `launcherDeletedCount = 8`
  - `launcherTriggersSelfUpdate = false`
- 本地导出验证通过：
  - 仅发布 game + 填写 launcher 删除项时，会直接触发 `launcher-delete-only-package` 错误

---

## 当前修改到的模块

- `Empire Earth II/地球帝国二代远航版启动器/Core/resources/app/main.js`（本机热修，目录被 `.gitignore` 排除）
- `更新器/src/ee2x_update_suite/shared/manifest_builder.py`
- `更新器/src/ee2x_update_suite/publisher/service.py`
- `更新器/src/ee2x_update_suite/publisher/http_backend.py`
- `更新器/update_backend_mg/app/service.py`

---

## 待办清单

- [ ] 在 Windows 真机上用修复后的启动器源码/构建产物验证：面对当前 `stable 1.0.1` 时不再先走 launcher 强更，而是直接更新 `game`
- [ ] 如需让 3010 线上立即恢复正常客户端体验，需要：
  - 重新构建包含 `main.js` 热修的启动器
  - 或发布一个正确的 `launcher 1.0.2+`
  - 或在已部署新后端后重写一次 `stable/latest.json`
- [ ] 由于 `Empire Earth II/` 被 `.gitignore` 排除，`main.js` 热修不会随 Git 推送到其他机器；后续需决定是否补一个可跟踪的启动器源码位置或重建正式产物

---

## 下一步

- 先基于本次后端/发布链修复，阻止新的 delete-only `launcher` 包继续上线
- 再处理客户端构建产物，让现有客户端在面对 `1.0.1` 时只更新 `game` 包，不再执行危险的 `launcher` 删除包
