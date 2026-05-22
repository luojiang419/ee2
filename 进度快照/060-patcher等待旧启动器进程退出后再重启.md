# 进度快照 060 — patcher 等待旧启动器进程退出后再重启

> 日期: 2026-05-22

---

## 已完成内容

### 1. patcher 已新增“旧启动器进程退出等待”

- 修改文件:
  - `更新器/src/ee2x_update_suite/patcher_v2/core.py`
- 新增逻辑:
  - `taskkill /IM` 与 `taskkill /F /IM` 后
  - 使用 `tasklist` 轮询同名启动器进程
  - 只有确认旧进程全部退出后，才执行 `_restart_launcher(...)`
- 超时策略:
  - 最长等待 8 秒
  - 若仍检测到旧进程，返回失败，不再盲目拉起新启动器

### 2. 已重编并覆盖运行时 `ee2x-patcher.exe`

- 构建产物:
  - `更新器/dist/ee2x-patcher.exe`
- 已同步覆盖到:
  - `Empire Earth II/地球帝国二代远航版启动器/update/ee2x-patcher.exe`
- 新二进制时间戳:
  - `2026-05-22 10:34:58`

### 3. 本轮修复目的

- 避免当前现象:
  - 更新器刚结束，启动器窗口几乎瞬间出现
  - 实际仍是旧实例未完全退出
  - 新实例被单实例锁折返到旧进程
- 本轮补强后:
  - 启动器侧会先释放锁并退出
  - patcher 侧会再确认旧进程全部消失
  - 然后才允许重新拉起全新启动器

---

## 当前修改到的模块

- `更新器/src/ee2x_update_suite/patcher_v2/core.py`
- `Empire Earth II/地球帝国二代远航版启动器/update/ee2x-patcher.exe`（运行时二进制，目录被 `.gitignore` 排除）

---

## 待办清单

- [ ] 在“更新完成后自动拉起的新启动器窗口”场景下复测
- [ ] 确认是否还会出现“几乎瞬间显示旧窗口”的现象
- [ ] 若仍异常，回收 `launcher.log` 中:
  - `[LauncherRestart]`
  - `[GamePath]`
  - `[GameStart]`
- [ ] 如 patcher 返回失败，记录是否出现“旧进程未在超时内退出”错误

---

## 下一步

- 先用这份新 `ee2x-patcher.exe` 做一次真实更新闭环测试
- 若问题消失，再将这份运行时更新器作为新的分发基线
