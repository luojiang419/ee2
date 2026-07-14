# AsagiriDestroyer（朝霧級）修改日志

> 文明: 日本 | 时代: E14 | 兵种: 海军（防空护卫舰）
> 对标: Ch054A（中国）

---

## 第1次修改 — 2026-06-28

**关联快照**: `进度快照\127-日本E14海军五舰参数最终版中×0.9.md`
**关联提交**: `550a257`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 5400 | upgrade_unittypes.csv |
| LOS | 11 | upgrade_unittypes.csv |
| DAMAGE | 315 | upgrade_unittypes.csv |
| RANGE | 11 | upgrade_unittypes.csv |
| RELOAD | 0.56 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 8100 | upgrade_unittypes.csv |
| LOS | 18 | upgrade_unittypes.csv |
| DAMAGE | 540 | upgrade_unittypes.csv |
| RANGE | 18 | upgrade_unittypes.csv |
| RELOAD | 0.89 | upgrade_unittypes.csv |
| BUILDTIME | 56 | upgrade_unittypes.csv |

### 修改依据
- 日本E14海军整体属性=中国同级×0.9，朝霧級对标Ch054A
- HP: 9000×0.9=8100 / LOS: 20×0.9=18 / DAMAGE: 600×0.9=540 / RANGE: 20×0.9=18 / RELOAD: 0.8×0.9=0.72→0.89（特殊调整）

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — AsagiriDestroyerUpgradeEpoch14行

---

## 第2次修改 — 2026-07-14

**关联快照**: `进度快照\128-日本E14海军五舰成本×0.9.md`
**关联提交**: `26122f76`
**修改类型**: 数值调整（成本）

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME | 56 | upgrade_unittypes.csv |
| FOOD | 325 | upgrade_unittypes.csv |
| WOOD | 475 | upgrade_unittypes.csv |
| STONE | 650 | upgrade_unittypes.csv |
| GOLD | 475 | upgrade_unittypes.csv |
| OIL | 0 | upgrade_unittypes.csv |
| URANIUM | 0 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME | 45 | upgrade_unittypes.csv |
| FOOD | 585 | upgrade_unittypes.csv |
| WOOD | 540 | upgrade_unittypes.csv |
| STONE | 585 | upgrade_unittypes.csv |
| GOLD | 540 | upgrade_unittypes.csv |
| OIL | 540 | upgrade_unittypes.csv |
| URANIUM | 90 | upgrade_unittypes.csv |

### 修改依据
- 成本统一为中国同级Ch054A×0.9
- Ch054A: BT=50/FOOD=650/WOOD=600/STONE=650/GOLD=600/OIL=600/URAN=100
- ×0.9: BT=45/FOOD=585/WOOD=540/STONE=585/GOLD=540/OIL=540/URAN=90

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — AsagiriDestroyerUpgradeEpoch14行
