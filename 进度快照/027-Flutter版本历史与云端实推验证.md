# 进度快照 027 — Flutter版本历史与云端实推验证

> 日期: 2026-05-20

---

## 已完成内容

### 1. 已处理 Flutter 启动/操作卡顿的主要风险点

- 目录扫描已从主 UI isolate 挪到 `Isolate.run(...)`
- 删除了主界面高频 `preview-dual` 刷新链路
- 不再在每次勾选文件时触发一次 bridge + 网络预览

### 2. “自动删除显示模块”已改成“版本历史”按钮模块

- 右侧统计区第三块不再显示自动删除数
- 改为点击式 `版本历史` 模块
- 点击后弹出服务器历史弹窗
- 弹窗内容包含：
  - 版本号
  - 发布时间
  - 更新说明
  - launcher/game 文件数
  - launcher/game 删除数

### 3. Python bridge 已新增服务器历史接口

- 新增命令：
  - `release-history`
- 数据来源：
  - 使用 `publish.local.json` 中的 SFTP 配置直连服务器
  - 读取当前频道 `releases/` 下的远端发布目录
  - 读取 `release-notes.txt`
  - 读取双 manifest / 兼容旧 manifest

### 4. 已完成真实云端推送测试

- 未碰 `stable`
- 使用临时测试频道：
  - `codex-live-test-1779273354`
- 已成功真实推送到服务器：
  - `latest.json`
  - `launcher/release-manifest.json`
  - `game/release-manifest.json`
  - 双 ZIP

### 5. 已验证服务器历史读取可回显刚才的真实推送

- 同一测试频道下执行 `release-history`
- 已返回 1 条真实历史记录：
  - `version = 0.1.0`
  - `launcherFileCount = 1`
  - `gameFileCount = 1`
  - `launcherDeletedCount = 0`
  - `gameDeletedCount = 0`

### 6. 关键验证已完成

- `python3 -m compileall 更新器/src/ee2x_update_suite`
- `python -m ee2x_update_suite.bridge release-history`
- `flutter analyze`
- 真实云端 `publish-dual`
- 测试频道 `latest.json` HTTP 回读成功

---

## 当前修改到的模块

- `更新器/flutter_publish_tool/lib/main.dart`
- `更新器/src/ee2x_update_suite/bridge/__main__.py`
- `更新器/src/ee2x_update_suite/publisher/service.py`
- `更新器/README.md`

---

## 待办清单

- [ ] 重新打包 Flutter Windows 产物，确保 `dist/ee2x-flutter-publisher` 为最新版本
- [ ] 如需更完整的历史页，可增加按频道筛选 / 历史详情折叠
- [ ] 在真实使用环境手动点开 EXE，确认卡顿问题主观体验已改善
- [ ] 视需要补一个“测试频道发布”快捷入口，避免误发到 `stable`

---

## 下一步

- 重新打包 Flutter 发布端 EXE
- 然后直接在 Windows 上手动打开一次：
  - 观察启动是否还卡
  - 点开版本历史
  - 验证历史弹窗是否能实时读到服务器记录
