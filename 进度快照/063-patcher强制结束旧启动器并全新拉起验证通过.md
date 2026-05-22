# 进度快照 063 — patcher 强制结束旧启动器并全新拉起验证通过

> 日期: 2026-05-22

---

## 已完成内容

### 1. 已将重启逻辑切换为“helper 同步执行到完成”

- 修改文件:
  - `更新器/src/ee2x_update_suite/patcher_v2/core.py`
- 行为变化:
  - patcher 不再仅仅“启动 helper 就算成功”
  - 现在会同步等待 helper 执行结束
  - 只有 helper 确认旧进程被清空并成功拉起新启动器，patcher 才返回成功

### 2. 已修复 helper 对中文路径与强杀命令的问题

- PowerShell 进程路径查询:
  - 改为 `-EncodedCommand` 传递 Unicode 脚本
  - 避免中文路径在 PowerShell 参数中乱码
- helper 脚本文件:
  - 改为带 BOM 的 `utf-8-sig`
  - 避免 Windows PowerShell 5.1 读取中文路径脚本时乱码
- 强杀命令:
  - 改为 `Start-Process taskkill.exe -Wait`
  - 不再出现“无法在管道中间运行文档”的错误

### 3. 本机已跑通真实闭环测试

测试方式:
- 手工将 `release-state.json` 中 `game.version` 暂时改为 `1.0.0`
- 启动真实运行时启动器
- 使用真实运行时 `update/ee2x-patcher.exe --headless` 执行一次 `scope=game` 更新
- 观察旧 PID / 新 PID / helper 日志 / result JSON

测试结果:
- 更新前 launcher 进程 PID:
  - `38864`
  - `35420`
  - `39384`
  - `38368`
- helper 等待并强制结束后，更新后新 launcher 进程 PID:
  - `26772`
  - `39916`
  - `10332`
  - `35168`
- 结论:
  - 旧 PID 已消失
  - 新 PID 为全新一组
  - 主进程命令行为 `--updated`
  - 已验证不是旧窗口折返

### 4. helper 日志已证明先杀旧实例，再拉起新实例

- helper 日志关键行为:
  - 连续等待旧 PID 退出
  - 超时后执行强制结束
  - 最后记录 `launching fresh launcher instance`
- patcher 结果 JSON:
  - `restartedLauncher = true`
  - `restartMessage = 启动器已通过重启助手全新拉起`

### 5. 已重编并替换运行时 `ee2x-patcher.exe`

- 已覆盖:
  - `Empire Earth II/地球帝国二代远航版启动器/update/ee2x-patcher.exe`
- 此运行时二进制已包含本轮全部修复

---

## 当前修改到的模块

- `更新器/src/ee2x_update_suite/patcher_v2/core.py`
- `Empire Earth II/地球帝国二代远航版启动器/update/ee2x-patcher.exe`

---

## 待办清单

- [ ] 让真实受影响用户再跑一次更新闭环
- [ ] 回收用户现场:
  - `update/runtime/last-updater-log.txt`
  - `%TEMP%\\ee2x-launcher-restart\\launcher-restart-helper.log`
  - `Logs/launcher.log`
- [ ] 确认用户现场也出现“旧 PID 消失、新 PID 重新生成”的现象

---

## 下一步

- 优先把当前整个启动器目录再次分发给用户复测
- 若用户现场也通过，这版就可作为新的正式分发基线
