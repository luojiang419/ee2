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
