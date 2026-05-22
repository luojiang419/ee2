# 进度快照 061 — patcher 按绝对路径等待旧启动器进程退出

> 日期: 2026-05-22

---

## 已完成内容

### 1. patcher 已从“按镜像名”升级为“按绝对路径精确匹配”

- 修改文件:
  - `更新器/src/ee2x_update_suite/patcher_v2/core.py`
- 新逻辑:
  - 通过 PowerShell `Get-CimInstance Win32_Process`
  - 按 `ExecutablePath == launcher_exe` 精确筛出旧启动器进程
  - 不再仅依赖 `IMAGENAME`

### 2. 已实现“温和结束 -> 强制结束 -> 等待确认退出”

- 对命中的旧进程:
  - 先 `taskkill /PID /T`
  - 若仍残留，再 `taskkill /F /PID /T`
- 等待规则:
  - 每 200ms 轮询一次
  - 默认上限 8 秒
  - 超时仍有残留 PID 时，直接判定失败

### 3. 查询失败时才降级为镜像名逻辑

- 只有 PowerShell 路径枚举失败时:
  - 才退回按 `IMAGENAME` 清理
  - 并在日志中明确写出“已降级为镜像名匹配”

### 4. 启动器重启成功判定已收紧

- 现在只有在以下条件同时成立时，才写入“启动器已重启”:
  - 旧启动器进程已确认全部退出
  - `Popen([launcher_exe, "--updated"])` 成功
- 若旧进程未退出:
  - patcher 直接返回失败
  - `last-updater-result.json` 不再写 `restartedLauncher: true`

### 5. 已重编并替换运行时二进制

- 源构建产物:
  - `dist/ee2x-patcher.exe`
- 已覆盖运行时:
  - `Empire Earth II/地球帝国二代远航版启动器/update/ee2x-patcher.exe`
- 当前产物信息:
  - 时间戳: `2026-05-22 10:49:47`
  - SHA256:
    - `9E9AB1ABFE10C242A208DDB1DF4AC42915786748DE3DD5B25F27EA321B632EFB`

---

## 当前修改到的模块

- `更新器/src/ee2x_update_suite/patcher_v2/core.py`
- `Empire Earth II/地球帝国二代远航版启动器/update/ee2x-patcher.exe`（运行时二进制，目录被 `.gitignore` 排除）

---

## 待办清单

- [ ] 让受影响用户再次执行一次完整更新闭环
- [ ] 观察更新完成后是否仍会“瞬间弹出旧窗口”
- [ ] 若仍异常，回收:
  - `update/runtime/last-updater-log.txt`
  - `update/runtime/last-updater-result.json`
  - `Logs/launcher.log`
- [ ] 重点检查日志中:
  - `[LauncherKill] 目标启动器路径`
  - `[LauncherKill] 命中旧启动器进程`
  - `[LauncherKill] 超时后仍有残留旧进程`
  - `[LauncherRestart] 已忽略 second-instance`

---

## 下一步

- 先用这份新 patcher 做一次真实更新验收
- 若问题消失，再把当前启动器目录作为新的正式分发基线
