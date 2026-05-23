# 进度快照 067 — 启动器独立更新机制 + 双 scope 解封

> 日期: 2026-05-23

---

## 已完成内容

### 1. Python Bridge — 解除 launcher 打包门禁

- **manifest_builder.py**: `_ensure_game_only_selection` → `_validate_scope_selection`，不再硬拒绝 launcher，仅 warn 纯 launcher 选择
- **service.py**: 删除 `_ensure_game_only_release` 函数 + `publish_dual_release` 中删除门禁调用；`announced_packages` 改为同时宣告 game + launcher
- 已有的双 scope ZIP 构建逻辑无需修改，本身已支持

### 2. Flutter UI — 解除 launcher 选择封锁

- `_pathCanBeSelected`: 从 `scope != launcher` 改为 `!_isProtectedLauncherRelativePath`
- `_toggleSelection`: 删除 launcher scope 拦截块，允许勾选
- `_buildTreeTile`: `selectionDisabled` 改为仅对受保护目录为 true
- 状态栏/发布范围/图例：动态显示 Game + Launcher
- `_applyLauncherSafePreset`: 更新提示文案

### 3. 渲染进程 — 恢复启动器更新检查 + 强制同步联动

- **`LauncherUpdateManager.checkForUpdates()`**: 不再硬编码 `return false`，改为真实调用 `releaseStatus()` 检测 `launcherNeedsUpdate`
- **`downloadUpdate()`**: 改为调用 `window.ee2x.downloadLauncherUpdate()` IPC，下载暂存后再提示安装
- **`showInstallPrompt()`**: 改为调用 `triggerLauncherExternalUpdate` 触发外部更新进程
- **强制同步弹窗**: 增加启动器更新信息卡片；确认按钮在 game 更新完成后自动检测 launcher 更新并提示重启

### 4. 主进程 — 新增 launcher 更新 IPC handler

- **`launcher:downloadAndStage`**: 获取 launcher 包 URL → 下载到 staging → SHA256 校验 → 解压 → 返回路径
- **`launcher:triggerExternalUpdate`**: 
  - 优先方案: spawn `ee2x-patcher-cli.exe --headless --scope launcher` (detached)
  - 后备方案: 生成 PS1 脚本 → spawn PowerShell (detached)
  - 然后 `prepareForLauncherReplacement()` → `app.exit(0)`
- **`generateLauncherUpdatePsScript()`**: 完整的 PowerShell 后备脚本生成器，含进程等待/原子替换/受保护目录跳过/备份/重启

### 5. preload.js — 新增 bridge API

- `downloadLauncherUpdate`: → `launcher:downloadAndStage`
- `triggerLauncherExternalUpdate`: → `launcher:triggerExternalUpdate`

---

## 受保护目录（始终不可打包/覆盖）

- `地球帝国二代远航版启动器/Config/`
- `地球帝国二代远航版启动器/Logs/`
- `地球帝国二代远航版启动器/data/userdata/`
- `地球帝国二代远航版启动器/data/game-csv/`
- `地球帝国二代远航版启动器/data/Settlement-img/`
- `地球帝国二代远航版启动器/update/runtime/`

---

## 已提交文件

- `Empire Earth II/.../main.js` — 新增 2 个 IPC handler + PS 脚本生成函数
- `Empire Earth II/.../preload.js` — 新增 2 个 bridge API
- `Empire Earth II/.../renderer.js` — 恢复 LauncherUpdateManager + 强制同步联动

## 未提交文件（更新器/ 被 gitignore 排除，需本地维护）

- `更新器/src/ee2x_update_suite/shared/manifest_builder.py`
- `更新器/src/ee2x_update_suite/publisher/service.py`
- `更新器/flutter_publish_tool/lib/main.dart`

---

## 当前修改到的模块

- 启动器自更新完整链路（检测→下载→暂存→外部进程→替换→重启）
- 打包器 launcher scope 解封（Python bridge + Flutter UI）
- 服务端双 scope 发布

---

## 待办清单

- [ ] 构建 `ee2x-patcher-cli.exe`（PyInstaller 打包 patcher_v2）并部署到客户端
- [ ] 发布一个包含 launcher 文件的测试更新包，端到端验证完整链路
- [ ] 在真实启动器环境测试：强制同步 → game 更新 → launcher 下载 → 重启 → 外部进程替换 → 启动器自启
- [ ] 验证受保护目录在更新过程中未被覆盖（Config 配置不丢失）

---

## 下一步

- 构建并部署 patcher-cli.exe 到客户端 update/runtime/
- 打包器端发布第一个包含 launcher 更新的测试包
- 端到端验证完整链路
