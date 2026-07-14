# DestroyerAtago（愛宕級）修改日志

> 文明: 日本 | 时代: E14 | 兵种: 海军（超级主力舰）
> 对标: Ch055A（中国） | ★ HP=57500保留

---

## 第1次修改 — 2026-06-28

**关联快照**: `进度快照\127-日本E14海军五舰参数最终版中×0.9.md`
**关联提交**: `570653c5`, `550a257`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 10000 | upgrade_unittypes.csv |
| DAMAGE | 800 | upgrade_unittypes.csv |
| RANGE | 18 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 57500 | upgrade_unittypes.csv（保留值）|
| LOS | 65 | upgrade_unittypes.csv |
| DAMAGE | 2700 | upgrade_unittypes.csv |
| RANGE | 37 | upgrade_unittypes.csv |
| RELOAD | 2.22 | upgrade_unittypes.csv |
| BUILDTIME | 222 | upgrade_unittypes.csv |

### 修改依据
- 愛宕級对标Ch055A，HP=57500用户确认保留，其余属性=Ch055A×0.9
- DAMAGE: 3000×0.9=2700 / RANGE: 41×0.9=36.9→37 / RELOAD: 2.0×0.9=1.8→2.22
- 新增专属E14Attack块(damage=2700/range=43/reload=2.22)修复攻击力仅1100问题

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — DestroyerAtagoUpgradeEpoch14行
- `EE2X_db/Units/Yuanhang_Tao_13naval_units.ddf` — DestroyerAtagoEpoch14Attack块

---

## 第2次修改 — 2026-07-14

**关联快照**: `进度快照\128-日本E14海军五舰成本×0.9.md`
**关联提交**: `26122f76`
**修改类型**: 数值调整（成本）

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME | 222 | upgrade_unittypes.csv |
| FOOD | 2000 | upgrade_unittypes.csv |
| WOOD | 3500 | upgrade_unittypes.csv |
| GOLD | 2000 | upgrade_unittypes.csv |
| OIL | 2000 | upgrade_unittypes.csv |
| URANIUM | 2000 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME | 180 | upgrade_unittypes.csv |
| FOOD | 2700 | upgrade_unittypes.csv |
| WOOD | 4050 | upgrade_unittypes.csv |
| GOLD | 4050 | upgrade_unittypes.csv |
| OIL | 4050 | upgrade_unittypes.csv |
| URANIUM | 4050 | upgrade_unittypes.csv |

### 修改依据
- 成本统一为中国同级Ch055A×0.9
- Ch055A: BT=200/FOOD=3000/WOOD=4500/GOLD=4500/OIL=4500/URAN=4500
- ×0.9: BT=180/FOOD=2700/WOOD=4050/GOLD=4050/OIL=4050/URAN=4050

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — DestroyerAtagoUpgradeEpoch14行
