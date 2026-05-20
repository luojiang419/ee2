# 进度快照 025 — Flutter发布端与双包强更链路落地

> 日期: 2026-05-20

---

## 已完成内容

### 1. 双包发布协议已落地

- `latest.json` 已升级为统一发布描述，支持：
  - `required`
  - `packages.launcher`
  - `packages.game`
- 兼容字段仍保留：
  - `manifestUrl`
  - `packageUrl`
  - `packageSha256`
  - `packageSize`
- `game` 包继续写入兼容字段，避免旧客户端立即失效

### 2. Python 发布核心已支持双包

- 新增 `launcher` / `game` 双 scope 构建能力
- 可按路径自动拆分：
  - `Empire Earth II/地球帝国二代远航版启动器/**` → `launcher`
  - 其余 → `game`
- 即使某一侧无文件，也会生成合法空包，保证版本统一
- 本地已验证可正确生成：
  - `EE2X-game-{version}.zip`
  - `EE2X-launcher-{version}.zip`

### 3. Flutter 发布端已创建并接通 Python bridge

- 新增工程：
  - `更新器/flutter_publish_tool/`
- 已实现：
  - 根目录状态区
  - 文件/文件夹勾选区
  - 列表/缩略切换
  - 删除清单输入
  - 自动归纳更新内容
  - 主题按钮深浅切换
  - 发布确认弹窗
  - 调用 Python bridge 执行真实双包推送

### 4. 启动器双包强更流程已接入

- 主进程新增统一 release 状态读取：
  - 读取统一 `latest.json`
  - 识别 `launcher` / `game` 双包
  - 读取新结构 `release-state.json`
- 外部更新器已支持 `--scope game|launcher`
- 启动器渲染层已接入新流程：
  - 启动后先检查 launcher 自升级
  - 再检查 game 强制更新
  - 更新完成后只按版本显示一次更新日志
- 左下角版本号改为优先读取 `release-state.game.version`

### 5. 主题切换已改为暗黑 / 浅色两态

- 主题按钮不再打开旧预设面板
- 改为直接切换：
  - `theme-dark`
  - `theme-light`
- 已补主要玻璃面板、弹窗、底部版本条、悬浮按钮的浅色覆盖样式

### 6. Windows 构建链已验证

- `flutter analyze` 已通过
- 直接在中文路径构建会失败，已复现并规避
- 新增：
  - `更新器/build_flutter_publish_tool.bat`
- 脚本会将 Flutter 工程镜像到 ASCII 临时路径再打包
- 已成功生成：
  - `更新器/dist/ee2x-flutter-publisher/ee2x_publish_tool.exe`

### 7. 阶段备份已完成

- 备份目录：
  - `backup/EE2X_db-010-flutter-dual-package-pre/`

---

## 当前修改到的模块

- `更新器/src/ee2x_update_suite/shared/`
- `更新器/src/ee2x_update_suite/publisher/`
- `更新器/src/ee2x_update_suite/bridge/`
- `更新器/flutter_publish_tool/`
- `更新器/build_flutter_publish_tool.bat`
- `更新器/README.md`
- `更新器/docs/发布协议.md`
- `更新器/docs/服务器部署说明.md`
- `Empire Earth II/地球帝国二代远航版启动器/Core/resources/app/main.js`
- `Empire Earth II/地球帝国二代远航版启动器/Core/resources/app/preload.js`
- `Empire Earth II/地球帝国二代远航版启动器/Core/resources/app/renderer/renderer.js`
- `Empire Earth II/地球帝国二代远航版启动器/Core/resources/app/renderer/styles.css`

---

## 待办清单

- [ ] 用真实 `publish.local.json` + 小范围文件选择做一次正式前双包推送验证
- [ ] 用真实启动器运行完整链路：
  - launcher 自升级
  - game 强制更新
  - 更新日志只弹一次
- [ ] 检查浅色主题下是否还有未变量化的深色硬编码区域
- [ ] 评估是否下线旧的 `LauncherUpdateManager` 残余逻辑，避免后续维护混淆
- [ ] 视需要补充 Flutter 发布端的“高级设置/配置路径切换”入口

---

## 下一步

- 直接使用 Flutter 发布端做一次真实小版本推送
- 频道优先用测试频道或最小范围文件
- 验证成功后再发 `stable`
