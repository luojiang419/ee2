# EE2X 更新器重构工程

本目录存放新的 EE2X 更新器套件源码，目标是替换旧的“直接下载 ZIP 并覆盖解压”的不安全链路，并统一到“双包发布 + 强制一致版本”的新流程。

## 目录结构

- `config/`：发布配置模板与本地私有配置
- `docs/`：协议与使用说明
- `src/ee2x_update_suite/shared/`：共享常量、模型、校验与文件处理逻辑
- `src/ee2x_update_suite/updater_gui/`：外部更新器 GUI
- `src/ee2x_update_suite/builder_gui/`：更新包创建与推送工具 GUI
- `src/ee2x_update_suite/bridge/`：Flutter 发布端调用的无界面桥接 CLI
- `src/ee2x_update_suite/publisher/`：发布协议、HTTP 发布客户端与历史兼容逻辑
- `flutter_publish_tool/`：Flutter Windows 发布端工程
- `dist/`：Windows 打包产物输出目录
- `releases/`：本地生成的发布包与清单

## 主要能力

1. Flutter 发布端在主界面直接编辑版本号和更新内容，从 `Empire Earth II/` 根目录勾选文件或文件夹，自动拆分 `launcher` / `game` 双包。
   - 选择整个启动器目录时，会自动排除 `Config / Logs / data/userdata / update/runtime` 等本地状态目录。
   - 如需下发公共启动器默认配置，改 `地球帝国二代远航版启动器/Defaults/launcher-public.json`，不要改 `Config/*.json` 发版。
2. Python bridge 负责读取新更新后端状态、本地生成双包 `release-manifest.json`，再通过 HTTP 发布 API 推送到新后端；正式分发版通过同目录 `ee2x-bridge.exe` 调用，不依赖系统 Python。
3. 新更新后端部署于 `http://115.231.35.105:3010`，负责版本历史、latest 描述、静态下载、服务端删除计算。
4. 外部更新器读取统一 `latest.json`，按 `scope=launcher|game` 分别下载、校验、备份、应用、回滚。
4. 启动器先完成自身升级，再强制完成游戏升级，最后只显示一次本次版本更新日志。

## 环境要求

- Python 3.12+
- Windows 打包时建议安装：
  - `paramiko`
  - `pyinstaller`
- Flutter 3.38+（当前环境验证为 `D:\flutter`）

安装依赖：

```bash
python -m pip install -r 更新器/requirements.txt
```

## 本地运行

外部更新器：

```bash
python -m ee2x_update_suite.updater_gui --root "G:\\Empire Earth II" --launcher-dir "G:\\Empire Earth II\\地球帝国二代远航版启动器" --server-base "http://115.231.35.105:3010" --channel stable
```

更新包创建工具：

```bash
python -m ee2x_update_suite.builder_gui
```

Flutter 发布端桥接信息：

```bash
PYTHONPATH=更新器/src python -m ee2x_update_suite.bridge remote-info --config 更新器/config/publish.local.json
```

Flutter 发布端本地构建双包：

```bash
PYTHONPATH=更新器/src python -m ee2x_update_suite.bridge prepare-dual --root "G:\\ee2\\Empire Earth II" --version 1.2.3 --notes-file notes.txt --selection-file selection.txt
```

Flutter 发布端版本历史：

```bash
PYTHONPATH=更新器/src python -m ee2x_update_suite.bridge release-history --config 更新器/config/publish.local.json --limit 20
```

Flutter 发布端删除远端版本：

```bash
PYTHONPATH=更新器/src python -m ee2x_update_suite.bridge delete-release --config 更新器/config/publish.local.json --release-id 1.2.3
```

Flutter 发布端 HTTP 推送：

```bash
PYTHONPATH=更新器/src python -m ee2x_update_suite.bridge publish-http --release-dir 更新器/releases/1.2.3 --config 更新器/config/publish.local.json
```

说明：

- `publish.local.json` 现已改为新后端配置，包含：
  - `backendBaseUrl`
  - `publishToken`
  - `channel`
- 删除项由新后端在发布时基于上一版 `release_files` 服务端自动计算。
- 启动器安全推送采用“公共默认配置 + 本地私有配置”分层：
  - 公共配置：`地球帝国二代远航版启动器/Defaults/launcher-public.json`
  - 本地私有状态：`地球帝国二代远航版启动器/Config/*.json`
- 版本历史弹窗已支持删除远端版本；删除当前 latest 时会自动回退到上一版，没有剩余版本时该频道变为未发布状态。
- Flutter 端已移除高频自动删除预览刷新，版本历史直接走 `3010` 的 HTTP API，启动和勾选时更流畅。

端到端烟雾测试：

```bash
PYTHONPATH=更新器/src python -m ee2x_update_suite.publisher.smoke_test --config 更新器/config/publish.local.json
```

说明：

- 烟雾测试会自动创建临时测试频道，不碰 `stable`
- 会验证三次发布、双 scope headless 接收、deleteList 生效、历史删除与 latest 回滚

## Windows 打包

- `build_bridge.bat`
- `build_updater.bat`
- `build_updater_cli.bat`
- `build_builder.bat`
- `build_flutter_publish_tool.bat`

Flutter Windows 产物通过 `build_flutter_publish_tool.bat` 先构建 `ee2x-bridge.exe`，再镜像到 ASCII 临时路径打包 Flutter EXE，避免中文目录导致的 Flutter/Windows 构建异常。正式交付目录为 `dist/ee2x-flutter-publisher/`，其中必须同时包含 `ee2x_publish_tool.exe` 与 `ee2x-bridge.exe`。

## 当前验证状态

- `ee2x-up-cli.exe` 已完成真实 Windows EXE headless 更新验证
- `ee2x-pack-builder.exe` 已完成最小启动验证
- `ee2x-up.exe` 已复制到启动器 `update/` 目录供实际使用
- `create_dual_release_bundle()` 已完成本地双包生成验证
- `flutter_publish_tool` 已通过 `flutter analyze`
- `build_flutter_publish_tool.bat` 已完成 Windows 产物验证，输出 `dist/ee2x-flutter-publisher/ee2x_publish_tool.exe`
- `ee2x-bridge.exe` 作为发布端 sidecar 一并分发，正式用户环境不再要求安装 Python
- `publisher.smoke_test` 已升级为 HTTP 双包端到端验证脚本
