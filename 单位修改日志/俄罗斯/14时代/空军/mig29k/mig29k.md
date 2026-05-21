# mig29k 修改日志

> 目录: `俄罗斯-14时代-空军-mig29k\`

---

## 第1次修改 — 2026-05-19

**关联快照**: `进度快照\019-空军初始设定.md`
**修改类型**: 数值调整(初始设定)

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 2000 | upgrade_unittypes.csv:1357 |
| DAMAGE | 810 | upgrade_unittypes.csv:1357 |
| 造价 | Food=0,Wood=550,Stone=0,Gold=550,Oil=550,Uranium=165 | upgrade_unittypes.csv:1357 |

---

## 第2次修改 — 2026-05-20 E14战斗机三国差异化重平衡

**关联快照**: `进度快照\030-E14战斗机三国差异化重平衡.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-20)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 2000 | upgrade_unittypes.csv:1357 |
| DAMAGE | 810 | upgrade_unittypes.csv:1357 |
| 造价 | Food=0,Wood=550,Stone=0,Gold=550,Oil=550,Uranium=165 | upgrade_unittypes.csv:1357 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 1500 | upgrade_unittypes.csv:1357 |
| DAMAGE | 570 | upgrade_unittypes.csv:1357 |
| 造价 | 全资源280(Food/Wood/Stone/Gold/Oil/Uranium) | upgrade_unittypes.csv:1357 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv:1357` — mig29kUpgradeEpoch14

### 修改依据
- 需求: E14战斗机三国差异化重平衡，俄罗斯mig29k皮实价廉定位
- 理由: 俄罗斯制空战斗机攻击略低于中国基准线5%，成本低7%，适合量产

### 已知影响
- mig29k在E14的HP从2000降至1500，攻击从810降至570，造价简化为全资源280
- 三国中成本最低，适合大规模部署

---

## 第3次修改 — 2026-05-21 E14空军移除粮食消耗

**关联快照**: `进度快照\056-E14空军移除粮食消耗.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-21)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| 造价 | 全资源280(Food/Wood/Stone/Gold/Oil/Uranium) | upgrade_unittypes.csv:1357 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| 造价 | Food=0, Wood/Stone/Gold/Oil/Uranium 各280 | upgrade_unittypes.csv:1357 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv:1357` — mig29kUpgradeEpoch14

### 修改依据
- 需求: 飞机消耗粮食不合理，移除FOOD成本
- 理由: 空军单位应只消耗工业资源，粮食用于陆军/生物单位

### 已知影响
- mig29k FOOD从280归零，其他5种资源保持280不变，总资源成本略降
