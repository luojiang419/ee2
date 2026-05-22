# Cruiser1164 修改日志

> 目录: `俄罗斯/14时代/海军/Cruiser1164/`

---

## 第1次修改 — 2026-05-21

**关联快照**: `进度快照\040-超级主力舰射速翻倍成本统一.md`
**修改类型**: 数值调整

### 修改前数据 (E14)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| RELOAD | 2.3 | upgrade_unittypes.csv:1190 |
| Wood | 3900 | upgrade_unittypes.csv:1190 |
| Gold | 0 | upgrade_unittypes.csv:1190 |
| Oil | 3900 | upgrade_unittypes.csv:1190 |
| Uranium | 2400 | upgrade_unittypes.csv:1190 |
| TechPts | 10 | dbtechtreenode.csv:169 |

### 修改后数据 (E14)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| RELOAD | 1.15 | upgrade_unittypes.csv:1190 |
| Wood | 3000 | upgrade_unittypes.csv:1190 |
| Gold | 3000 | upgrade_unittypes.csv:1190 |
| Oil | 3000 | upgrade_unittypes.csv:1190 |
| Uranium | 3000 | upgrade_unittypes.csv:1190 |
| TechPts | 50 | dbtechtreenode.csv:169 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — 第1190行 Cruiser1164UpgradeEpoch14
- `EE2X_db/TechTree/dbtechtreenode.csv` — 第169行 Cruiser1164

### 修改依据
- 需求: 领袖级成本木3000/金3000/石油3000/铀3000/科技点50，射速提升1倍
- 理由: 超级主力舰三艘统一成本，RELOAD减半=射速翻倍。Cruiser1164原始RELOAD较低(2.3→1.15)，但保持一致性

### 已知影响
- 与Ch055A(055A改进型)、DDG1001(朱姆沃尔特)同步调整，三艘成本统一

---

## 第2次修改 — 2026-05-21 14:30

**关联快照**: 本次对话
**修改类型**: 数值调整

### 修改前数据 (E14)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 37500 | upgrade_unittypes.csv:1190 |
| LOS | 46 | upgrade_unittypes.csv:1190 |
| DAMAGE | 2850 | upgrade_unittypes.csv:1190 |
| RANGE | 46 | upgrade_unittypes.csv:1190 |
| RELOAD | 1.15 | upgrade_unittypes.csv:1190 |
| BUILDTIME | 120 | upgrade_unittypes.csv:1190 |
| Gold | 3000 | upgrade_unittypes.csv:1190 |
| Iron | 0 | upgrade_unittypes.csv:1190 |
| Oil | 3000 | upgrade_unittypes.csv:1190 |
| Uranium | 3000 | upgrade_unittypes.csv:1190 |

### 修改后数据 (E14)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 50000 | upgrade_unittypes.csv:1190 |
| LOS | 43 | upgrade_unittypes.csv:1190 |
| DAMAGE | 3300 | upgrade_unittypes.csv:1190 |
| RANGE | 43 | upgrade_unittypes.csv:1190 |
| RELOAD | 2.0 | upgrade_unittypes.csv:1190 |
| BUILDTIME | 130 | upgrade_unittypes.csv:1190 |
| Gold | 2500 | upgrade_unittypes.csv:1190 |
| Iron | 0 | upgrade_unittypes.csv:1190 |
| Oil | 2500 | upgrade_unittypes.csv:1190 |
| Uranium | 2800 | upgrade_unittypes.csv:1190 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — 第1190行 Cruiser1164UpgradeEpoch14

### 修改依据
- 需求: 俄罗斯领袖级独立差异化，HP50000/攻3300/射43/视野43/装填2s/建造130s; 金2500/油2500/铀2800

- 理由: 区别于中美的42000HP/3000攻/48射，俄系高血量低射程装填慢的风格化定位

### 已知影响
- Cruiser1164从三艘统一配置中独立出来，HP最高但射程最短装填最慢
- 与Ch055A(1.0s)/DDG1001(1.0s)射速差距拉大(2.0s vs 1.0s)

---

## 第3次修改 — 2026-05-22

**关联快照**: 本次修改
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 37500 | upgrade_unittypes.csv:1190 |
| DAMAGE | 2850 | upgrade_unittypes.csv:1190 |
| RANGE | 46 | upgrade_unittypes.csv:1190 |
| RELOAD | 1.15 | upgrade_unittypes.csv:1190 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 52000 | upgrade_unittypes.csv:1190 |
| DAMAGE | 3300 | upgrade_unittypes.csv:1190 |
| RANGE | 43 | upgrade_unittypes.csv:1190 |
| RELOAD | 2.3 | upgrade_unittypes.csv:1190 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — Cruiser1164UpgradeEpoch14 行

### 修改依据
- 需求: Cruiser1164 HP→52000/DAMAGE→3300/RANGE→43/RELOAD 1.15→2.3（射速减半+增强）
- 理由: 俄系风格化定位——最高HP+最高伤害+最短射程+最慢装填，与Ch055A/DDG1001形成差异化

### 已知影响
- 三舰差异化格局: Ch055A/DDG1001(42000/3000/48/2.0)，Cruiser1164(52000/3300/43/2.3)
