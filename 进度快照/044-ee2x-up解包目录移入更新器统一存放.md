# 进度快照 044 — ee2x-up 解包目录移入更新器统一存放

> 日期: 2026-05-21

---

## 已完成内容

### 1. 已确认 `ee2x-up.exe_extracted` 的性质

- 该目录不是游戏或启动器运行时依赖
- 内容特征包括：
  - `PYZ.pyz`
  - `PYZ.pyz_extracted/`
  - 各类 `.pyc / .pyd / .dll`
- 这是典型的 **PyInstaller EXE 解包产物**
- 结合目录名判断：
  - 它来自对 `ee2x-up.exe` 的手工解包/提取
  - 主要用途是做内容核对、逆向排查、打包问题分析

### 2. 已从项目根目录移走

- 原位置：
  - `ee2x-up.exe_extracted/`
- 新位置：
  - `更新器/ee2x-up.exe_extracted/`

这样处理后：

- 项目主目录更干净
- 更新器相关分析产物统一归档到 `更新器/`
- 不再和游戏主工程目录混放

### 3. 已做移动前备份

- 备份目录：
  - `backup/EE2X_db-022-move-ee2x-up-extracted-pre/`

---

## 当前修改到的模块

- `更新器/ee2x-up.exe_extracted/` — 新位置
- `ee2x-up.exe_extracted/` — 从根目录移除

---

## 待办清单

- [ ] 如后续文档需要引用该目录，统一使用新路径 `更新器/ee2x-up.exe_extracted/`

---

## 下一步

- 继续保持所有更新器构建产物、解包分析目录、历史 PyInstaller 输出统一放在 `更新器/` 体系下
