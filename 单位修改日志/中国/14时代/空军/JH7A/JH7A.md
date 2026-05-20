# JH7A 修改日志

> 目录: `中国-14时代-空军-JH7A\`

---

## 第1次修改 — 2026-05-19

**关联快照**: `进度快照\019-空军初始设定.md`
**修改类型**: 数值调整(初始设定)

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 1900 | upgrade_unittypes.csv:1295 |
| DAMAGE | 808 | upgrade_unittypes.csv:1295 |
| 造价 | Food=0,Wood=550,Stone=0,Gold=550,Oil=165,Uranium=550 | upgrade_unittypes.csv:1295 |

---

## 第2次修改 — 2026-05-20 E14多用途战斗机三国差异化重平衡

**关联快照**: `进度快照\030-E14战斗机三国差异化重平衡.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-20)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 1900 | upgrade_unittypes.csv:1295 |
| DAMAGE | 808 | upgrade_unittypes.csv:1295 |
| 造价 | Food=0,Wood=550,Stone=0,Gold=550,Oil=165,Uranium=550 | upgrade_unittypes.csv:1295 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 2500 | upgrade_unittypes.csv:1295 |
| DAMAGE | 1000 | upgrade_unittypes.csv:1295 |
| 造价 | 全资源450(Food/Wood/Stone/Gold/Oil/Uranium) | upgrade_unittypes.csv:1295 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv:1295` — JH7AUpgradeEpoch14

### 修改依据
- 需求: E14多用途战斗机三国差异化重平衡，中国JH7A为基准线(HP2500/ATK1000/成本450)
- 理由: 三国多用途战斗机按差异化幅度调整——美国重装高火力(A10: 2900/1200/500)，俄罗斯低价量产(su25: 2500/850/400)，中国居中

### 已知影响
- JH7A在E14的HP从1900升至2500，攻击从808升至1000，造价简化为全资源450
- 与A10的重装定位和su25的低成本定位形成梯度
