---
description: EE2模组开发核心规则。修改游戏数据、单位属性、科技树、DDF/CSV文件时必须遵守。涉及数值调整、单位修改、数据库变更时自动加载。
allowed-tools: Bash(git diff,git log,git status,git add,git commit,git pull,git push,pwsh *,python *) Read Grep Edit Write Glob
---

# EE2 模组开发核心规则

> 完整规则详见项目根目录 `地球帝国游戏开发规则.md`。本技能为精简版，聚焦每次修改必须遵守的铁律。

## 第0步：会话开始拉取

每次新会话开始，**立即执行 `git pull origin main`**，优先级高于一切。

## 强制推送铁律

- **每次修改后必须立即 commit + push**（已配置 post-commit hook 自动推送）
- **严禁累积多次修改后批量提交** — 每次修改 = 一个独立 commit
- 提交信息用中文简要描述改动内容

## DDF 修改铁律（违反必导致游戏崩溃）

1. **DDF 换行符必须是 LF** — 禁止用 `Set-Content`、`Out-File` 写入 DDF，它们会转 CRLF
2. **禁止正则跨行替换** — DDF 中重复模式极多，`(?s)` 跨行匹配会误伤无关单位
3. **只使用精确行号定位** — 用 diff 获取目标行号，PowerShell `ReadAllText` + split + 精确行替换 + `WriteAllText`
4. **改后必须 diff 验证** — 与备份对比，确认只有目标行被改动

安全写法：
```powershell
$lines = [System.IO.File]::ReadAllText($path).split("`n")
$lines[行号-1] = "新内容"
[System.IO.File]::WriteAllText($path, [string]::Join("`n", $lines))
```

## 数据库修改生效链路

**修改 `game-metadata\EE2X_db\` 后必须更新 ZIP**，否则游戏不生效：
```
修改工作DB → 打包到 Empire Earth II\zips_ee2x\EE2X_db.zip → 启动游戏验证
```

## 单位名称铁律

**必须使用游戏文件内的原始中/英文名称**，严禁自行翻译。例如 `ArmoredCar` 不能写成"装甲车"，`Ch054A` 不能写成"中国054A护卫舰"。

## 关键技术数据

### 工程路径
| 项目 | 路径 |
|:-----|:-----|
| 游戏目录 | `Empire Earth II\` |
| 工作数据库 | `game-metadata\EE2X_db\` |
| 游戏读取的ZIP | `Empire Earth II\zips_ee2x\EE2X_db.zip` |

### 核心文件映射
| 修改目标 | 关键文件 |
|:---------|:---------|
| 单位属性(HP/伤害/造价等) | `EE2X_db/TechTree/upgrade_unittypes.csv` |
| 科技树 | `EE2X_db/TechTree/dbtechtreenode.csv` |
| 单位模型/人口/RPS | `EE2X_db/Units/*.ddf` |
| 百分比加成 | `EE2X_db/TechTree/upgrade_factorset.csv` |
| 文明属性 | `EE2X_db/Civilizations/*.ddf` |
| 兵种克制 | `EE2X_db/Simulation/dbcombat_unittypeadjust.csv` |
| 单位名称文本 | `EE2X_db/Text/dbtext_unittypenames.utf8` |

### 关键注意
- **CSV 不是唯一数据源** — DDF 中的 `UpgradeAbilities`/`UpgradeSize` 会覆盖 CSV
- **船只人口在 DDF** — CSV 人口列对船只无效，实际是 DDF 的 `popCount`
- **RPS 类型在 DDF** — 由 DDF 的 `rps` 字段决定
- **升级引用一致性** — `dbtechtreenode.csv` 的 UPGRADE 值必须能在 `upgrade_unittypes.csv` 中找到
- **资源时代限制** — Tin(E1-E6), Iron(E4-E9), Saltpeter(E7-E12), Oil(E10-E15), Uranium(E13-E15)

## 工作流程

### 修改安全流程
1. 备份数据库到 `backup\`
2. CSV 用 Edit 工具、DDF 用精确行号 + LF 保持法
3. 修改后 diff 对比备份确认无误伤
4. **打包到游戏 ZIP**
5. 启动游戏验证
6. **git add + git commit**（自动推送）

### 进度快照
每完成一个功能，生成快照到 `进度快照\`，文件名 `{序号}-{简要描述}.md`

### 单位修改日志
每次修改记录到 `单位修改日志\{文明}\{时代}\{兵种}\{单位名}\{单位名}.md`

### 备份
每个功能阶段开始前备份到 `backup\`

## 工具使用注意事项

- **Glob 禁止用于中文目录**（`进度快照`、`单位修改日志` 等），用 PowerShell `Get-ChildItem` 代替
- **Glob 可用于英文路径**（`EE2X_db`、`game-metadata` 等）

## 环境配置

| 配置项 | 值 |
|:-------|:---|
| Git 代理 | `http://127.0.0.1:7890` |
| Git SSL | `schannel` |

## 恢复工作流程

1. `git pull origin main`
2. 读 `地球帝国游戏开发规则.md`
3. 读最新进度快照（`进度快照\` 中序号最大的文件）
4. 查 `单位修改日志\INDEX.md`
5. 从快照"下一步"继续，不重复提问
