# 进度快照 033 — 发布端内置 bridge 侧车完成

> 日期: 2026-05-20

---

## 已完成内容

### 1. 发布端已从“依赖系统 Python”改为“内置 `ee2x-bridge.exe`”

- Flutter 发布端运行时现在优先调用同目录：
  - `ee2x-bridge.exe`
- 仅开发态才回退尝试：
  - `py -3`
  - `python`
  - `python3`
- 现在如果侧车缺失，会明确提示：
  - 缺少内置 `bridge.exe`
- 不再只报模糊的：
  - `Bad state: 系统找不到指定的文件`

### 2. bridge 冻结后的路径解析已处理

- `更新器/src/ee2x_update_suite/bridge/__main__.py`
- 已支持从以下来源推导工作目录：
  - `EE2X_UPDATER_WORKSPACE`
  - 当前工作目录 / `当前工作目录/更新器`
  - 冻结后 EXE 所在目录向上搜索
  - 源码路径回退
- `prepare-dual` 已正式接收 `--config`
- 只有当配置文件位于 `更新器/config/` 下时，才用它推导 `releases/` 输出目录

### 3. 已新增 bridge 专用打包脚本

- 新脚本：
  - `更新器/build_bridge.bat`
- 产物：
  - `更新器/dist/ee2x-bridge.exe`
- 现在 `.spec` 不再落到 `更新器/` 根目录
- 已改为输出到：
  - `更新器/build/ee2x-bridge/`

### 4. Flutter 打包链路已接入 sidecar

- `更新器/build_flutter_publish_tool.bat`
- 现在打包顺序为：
  1. 先构建 `ee2x-bridge.exe`
  2. 再构建 Flutter Windows EXE
  3. 最后把 `ee2x-bridge.exe` 复制进正式产物目录
- 正式目录必须同时包含：
  - `ee2x_publish_tool.exe`
  - `ee2x-bridge.exe`

### 5. sidecar 命令已完成真实 3010 验证

- 已直接使用：
  - `更新器/dist/ee2x-flutter-publisher/ee2x-bridge.exe`
- 对真实 `3010` 成功执行：
  - `remote-info`
  - `prepare-dual`
  - `publish-http`
  - `release-history`
  - `delete-release`
- 验证频道：
  - `codex-bridge-sidecar-1779281999`
- 发布后已成功删除，频道恢复为空

### 6. 正式发布端主目录版已重新编译

- 正式产物目录：
  - `更新器/dist/ee2x-flutter-publisher/`
- 当前关键文件时间戳：
  - `ee2x_publish_tool.exe` → `2026-05-20 21:02:01`
  - `ee2x-bridge.exe` → `2026-05-20 21:01:16`
- 目录内容已确认包含：
  - `data/`
  - `ee2x_publish_tool.exe`
  - `ee2x-bridge.exe`
  - `file_selector_windows_plugin.dll`
  - `flutter_windows.dll`

### 7. 启动冒烟已完成

- 新版 `ee2x_publish_tool.exe` 已可正常拉起进程
- 旧残留 `ee2x_publish_tool` 进程已清理

---

## 当前修改到的模块

- `更新器/flutter_publish_tool/lib/main.dart`
- `更新器/src/ee2x_update_suite/bridge/__main__.py`
- `更新器/build_bridge.bat`
- `更新器/build_flutter_publish_tool.bat`
- `更新器/README.md`

---

## 待办清单

- [ ] 在 Windows 上手点一次新版主目录版：
  - 选择文件
  - 填版本号
  - 点“推送更新到服务器”
- [ ] 如需更强验证，可补一个自动化 UI 冒烟（当前已完成命令级闭环，但未做按钮点击自动化）

---

## 下一步

- 直接运行：
  - `更新器/dist/ee2x-flutter-publisher/ee2x_publish_tool.exe`
- 优先确认两项：
  - 没装 Python 的环境下点击“推送更新到服务器”是否已正常工作
  - 版本历史删除是否仍可正常回退 latest
