# HarushioSubmarine（春潮級）修改日志

> 文明: 日本 | 时代: E14 | 兵种: 海军（潜艇）
> 对标: Type039B（中国） | ★ DAMAGE=20000保留

---

## 第1次修改 — 2026-06-28

**关联快照**: `进度快照\127-日本E14海军五舰参数最终版中×0.9.md`
**关联提交**: `550a257`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 5000 | upgrade_unittypes.csv |
| DAMAGE | 500 | upgrade_unittypes.csv |
| RANGE | 17 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 1440 | upgrade_unittypes.csv |
| LOS | 21 | upgrade_unittypes.csv |
| DAMAGE | 20000 | upgrade_unittypes.csv（有意保留）|
| RANGE | 21 | upgrade_unittypes.csv |
| RELOAD | 2.22 | upgrade_unittypes.csv |
| BUILDTIME | 50 | upgrade_unittypes.csv |

### 修改依据
- 日本E14海军整体属性=中国同级×0.9，春潮級对标Type039B
- HP: 1600×0.9=1440 / DAMAGE=20000有意保留（非Type039B×0.9=9000）

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — HarushioSubmarineUpgradeEpoch14行

---

## 第2次修改 — 2026-07-14

**关联快照**: `进度快照\128-日本E14海军五舰成本×0.9.md`
**关联提交**: `26122f76`
**修改类型**: 数值调整（成本）

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME | 50 | upgrade_unittypes.csv |
| WOOD | 990 | upgrade_unittypes.csv |
| GOLD | 855 | upgrade_unittypes.csv |
| OIL | 900 | upgrade_unittypes.csv |
| URANIUM | 990 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME | 40 | upgrade_unittypes.csv |
| WOOD | 495 | upgrade_unittypes.csv |
| GOLD | 428 | upgrade_unittypes.csv |
| OIL | 450 | upgrade_unittypes.csv |
| URANIUM | 495 | upgrade_unittypes.csv |

### 修改依据
- 成本统一为中国同级Type039B×0.9
- Type039B: BT=45/WOOD=550/GOLD=475/OIL=500/URAN=550
- ×0.9: BT=40(40.5舍入)/WOOD=495/GOLD=428(427.5舍入)/OIL=450/URAN=495

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — HarushioSubmarineUpgradeEpoch14行
