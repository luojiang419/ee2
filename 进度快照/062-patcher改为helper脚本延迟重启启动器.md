# 进度快照 062 — patcher 改为 helper 脚本延迟重启启动器

> 日期: 2026-05-22

---

## 已完成内容

### 1. patcher 最终重启机制已改为外部 helper 脚本

- 修改文件:
  - `更新器/src/ee2x_update_suite/patcher_v2/core.py`
- 旧逻辑:
  - patcher 在自身进程内直接 `Popen([launcher_exe, "--updated"])`
- 新逻辑:
  - patcher 生成 `launcher-restart-helper.ps1`
  - helper 脚本在 patcher 退出后继续执行
  - 持续监视并等待旧启动器进程完全消失
  - 必要时再次强制杀掉残留 PID
  - 最后再启动全新的启动器实例

### 2. 这样做的目的

- 避免当前现象:
  - 更新一结束，启动器窗口几乎瞬间出现
  - 实际旧实例可能尚未完全退出
  - 新实例抢锁后又折返到旧窗口
- 现在改为:
  - patcher 只负责更新 + 安排 helper
  - helper 在 patcher 之外继续盯住旧进程
  - 只有确认旧进程彻底消失后，才真正拉起新启动器

### 3. helper 脚本行为

- 读取目标启动器绝对路径
- 使用 `Get-CimInstance Win32_Process` 按 `ExecutablePath` 精确匹配
- 等待上限约 12 秒
- 若仍残留:
  - 再次执行按 PID 的 `taskkill /F /T`
- 若最终仍残留:
  - 记录日志并终止，不拉起新实例
- 若已完全退出:
  - 额外等待约 900ms
  - 再 `Start-Process` 拉起全新启动器

### 4. 已重编并替换运行时 `ee2x-patcher.exe`

- 源构建产物:
  - `dist/ee2x-patcher.exe`
- 已覆盖运行时:
  - `Empire Earth II/地球帝国二代远航版启动器/update/ee2x-patcher.exe`
- 当前产物信息:
  - 时间戳: `2026-05-22 11:01:51`
  - SHA256:
    - `EB8E698A8D1A51A1CB51322FDE080C74D03CC10DB35B7FDC557C260FEF51A373`

### 5. 新增辅助日志文件

- helper 会写:
  - `update/runtime/launcher-restart-helper.log`
- 可用于确认:
  - 是否仍检测到旧进程
  - 是否进行了二次强杀
  - 是否真的启动了新实例

---

## 当前修改到的模块

- `更新器/src/ee2x_update_suite/patcher_v2/core.py`
- `Empire Earth II/地球帝国二代远航版启动器/update/ee2x-patcher.exe`

---

## 待办清单

- [ ] 让受影响用户再跑一次完整更新
- [ ] 检查更新后窗口是否仍“瞬间出现”
- [ ] 回收:
  - `update/runtime/last-updater-log.txt`
  - `update/runtime/launcher-restart-helper.log`
  - `Logs/launcher.log`
- [ ] 对比三份日志确认:
  - 旧进程是否真的退出
  - helper 是否执行了二次强杀
  - 新实例是否由 helper 拉起

---

## 下一步

- 优先用这份新 helper 版 patcher 做一次真实用户验收
- 若仍瞬间弹窗，则可进一步改成“更新后不自动拉起，只允许手动重开”作为最终兜底方案
