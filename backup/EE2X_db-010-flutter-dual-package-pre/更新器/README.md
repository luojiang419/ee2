# EE2X 更新器重构工程

本目录存放新的 EE2X 更新器套件源码，目标是替换旧的“直接下载 ZIP 并覆盖解压”的不安全链路。

## 目录结构

- `config/`：发布配置模板与本地私有配置
- `docs/`：协议与使用说明
- `src/ee2x_update_suite/shared/`：共享常量、模型、校验与文件处理逻辑
- `src/ee2x_update_suite/updater_gui/`：外部更新器 GUI
- `src/ee2x_update_suite/builder_gui/`：更新包创建与推送工具 GUI
- `src/ee2x_update_suite/publisher/`：静态发布目录生成与 SFTP 推送逻辑
- `dist/`：Windows 打包产物输出目录
- `releases/`：本地生成的发布包与清单

## 主要能力

1. 启动器点击一键更新后，拉起外部更新器。
2. 更新器读取 `updates/{channel}/latest.json`，执行下载、校验、备份、应用、回滚。
3. 包创建工具从 `Empire Earth II/` 根目录任意层级选择文件或文件夹，生成以 `Empire Earth II/` 为顶级目录的标准 ZIP。
4. 包创建工具可通过 SFTP 上传发布包、`release-manifest.json`、`release-notes.txt` 和 `latest.json`。

## 环境要求

- Python 3.12+
- Windows 打包时建议安装：
  - `paramiko`
  - `pyinstaller`

安装依赖：

```bash
python -m pip install -r 更新器/requirements.txt
```

## 本地运行

外部更新器：

```bash
python -m ee2x_update_suite.updater_gui --root "G:\\Empire Earth II" --launcher-dir "G:\\Empire Earth II\\地球帝国二代远航版启动器" --server-base "http://127.0.0.1:1234" --channel stable
```

更新包创建工具：

```bash
python -m ee2x_update_suite.builder_gui
```

端到端烟雾测试：

```bash
PYTHONPATH=更新器/src python -m ee2x_update_suite.publisher.smoke_test --config 更新器/config/publish.local.json --channel codex-e2e-3
```

## Windows 打包

- `build_updater.bat`
- `build_updater_cli.bat`
- `build_builder.bat`

打包输出默认放入 `dist/`。

## 当前验证状态

- `ee2x-up-cli.exe` 已完成真实 Windows EXE headless 更新验证
- `ee2x-pack-builder.exe` 已完成最小启动验证
- `ee2x-up.exe` 已复制到启动器 `update/` 目录供实际使用
