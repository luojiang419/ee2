# Zuikaku（瑞鶴級）修改日志

> 文明: 日本 | 时代: E14 | 兵种: 海军（航空母舰）
> 对标: ChinaCarrier（中国）

---

## 第1次修改 — 2026-06-28

**关联快照**: `进度快照\127-日本E14海军五舰参数最终版中×0.9.md`
**关联提交**: `550a257`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 15700 | upgrade_unittypes.csv |
| DAMAGE | 100 | upgrade_unittypes.csv |
| RANGE | 15 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 25650 | upgrade_unittypes.csv |
| LOS | 24 | upgrade_unittypes.csv |
| DAMAGE | 522 | upgrade_unittypes.csv |
| RANGE | 23 | upgrade_unittypes.csv |
| RELOAD | 1.78 | upgrade_unittypes.csv |
| BUILDTIME | 167 | upgrade_unittypes.csv |

### 修改依据
- 日本E14海军整体属性=中国同级×0.9，瑞鶴級对标ChinaCarrier
- HP: 28500×0.9=25650 / DAMAGE: 580×0.9=522 / RANGE: 25×0.9=22.5→23

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — ZuikakuEpoch14行

---

## 第2次修改 — 2026-07-14

**关联快照**: `进度快照\128-日本E14海军五舰成本×0.9.md`
**关联提交**: `26122f76`
**修改类型**: 数值调整（成本）

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME | 167 | upgrade_unittypes.csv |
| WOOD | 1500 | upgrade_unittypes.csv |
| GOLD | 1500 | upgrade_unittypes.csv |
| OIL | 1500 | upgrade_unittypes.csv |
| URANIUM | 1500 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME | 135 | upgrade_unittypes.csv |
| WOOD | 2700 | upgrade_unittypes.csv |
| GOLD | 2700 | upgrade_unittypes.csv |
| OIL | 2700 | upgrade_unittypes.csv |
| URANIUM | 2700 | upgrade_unittypes.csv |

### 修改依据
- 成本统一为中国同级ChinaCarrier×0.9
- ChinaCarrier: BT=150/WOOD=3000/GOLD=3000/OIL=3000/URAN=3000
- ×0.9: BT=135/WOOD=2700/GOLD=2700/OIL=2700/URAN=2700

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — ZuikakuEpoch14行
