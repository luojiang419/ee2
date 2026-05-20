# 进度快照 028 — Flutter卡顿修复与版本历史云端验证

> 日期: 2026-05-20

---

## 已完成内容

### 1. Flutter 运行卡顿的两处主要风险已处理

- 游戏目录扫描已改为 `Isolate.run(...)`，不再占用主 UI isolate
- 主界面已移除高频 `preview-dual` 远端预览刷新链路
- 勾选文件时不再反复触发 Python bridge + 网络请求

### 2. “自动删除显示模块”已改成“版本历史”按钮模块

- 右侧第三块统计卡片已替换为：
  - `版本历史`
- 点击后会弹出历史弹窗
- 历史弹窗展示：
  - 版本号
  - 时间
  - 更新说明
  - launcher/game 文件数
  - launcher/game 删除数

### 3. Python bridge 已支持服务器历史读取

- 新增命令：
  - `release-history`
- 通过 `publish.local.json` 中的 SFTP 配置直连服务器
- 读取当前频道 `releases/` 目录
- 优先读取双包 manifest
- 若遇到旧结构，兼容读取 legacy manifest

### 4. 已完成真实云端推送测试

- 使用真实服务器与真实 VPS 凭据
- 未触碰 `stable`
- 使用测试频道：
  - `codex-live-test-1779273354`
- 已成功发布：
  - `latest.json`
  - `launcher/release-manifest.json`
  - `game/release-manifest.json`
  - 双包 ZIP

### 5. 已验证服务器历史能读回真实推送

- 对测试频道执行 `release-history`
- 已正确返回 1 条远端历史记录：
  - `version = 0.1.0`
  - `launcherFileCount = 1`
  - `gameFileCount = 1`
  - `launcherDeletedCount = 0`
  - `gameDeletedCount = 0`

### 6. Flutter Windows 产物已重新构建

- `flutter analyze` 通过
- `build_flutter_publish_tool.bat` 已再次构建
- 产物目录仍为：
  - `更新器/dist/ee2x-flutter-publisher/`

### 7. 打包脚本已增强容错

- 若目标输出目录中的旧 EXE 正在运行导致覆盖失败
- 脚本会自动回退输出到：
  - `更新器/dist/ee2x-flutter-publisher-next/`

---

## 当前修改到的模块

- `更新器/flutter_publish_tool/lib/main.dart`
- `更新器/src/ee2x_update_suite/bridge/__main__.py`
- `更新器/src/ee2x_update_suite/publisher/service.py`
- `更新器/build_flutter_publish_tool.bat`
- `更新器/README.md`

---

## 待办清单

- [ ] 在 Windows 上手动打开最新 EXE，主观确认“卡死”问题是否消失
- [ ] 如需更顺手，可在 UI 上增加“刷新历史”按钮或频道显示强化
- [ ] 如需安全隔离，可给发布端补一个“测试频道发布”快捷切换入口
- [ ] 根据需要清理测试频道 `codex-live-test-1779273354`

---

## 下一步

- 直接在 Windows 上运行：
  - `更新器/dist/ee2x-flutter-publisher/ee2x_publish_tool.exe`
- 手动验证三件事：
  - 启动是否流畅
  - 版本历史按钮是否能拉到服务器数据
  - 主界面填写版本号/更新内容后是否可继续真实发布
