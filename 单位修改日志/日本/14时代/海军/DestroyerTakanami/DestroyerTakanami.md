# DestroyerTakanami（高波級）修改日志

> 文明: 日本 | 时代: E14 | 兵种: 海军（驱逐舰）
> 对标: Ch052d（中国）

---

## 第1次修改 — 2026-06-28

**关联快照**: `进度快照\127-日本E14海军五舰参数最终版中×0.9.md`
**关联提交**: `550a257`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 7000 | upgrade_unittypes.csv |
| DAMAGE | 500 | upgrade_unittypes.csv |
| RANGE | 17 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 14400 | upgrade_unittypes.csv |
| LOS | 21 | upgrade_unittypes.csv |
| DAMAGE | 900 | upgrade_unittypes.csv |
| RANGE | 23 | upgrade_unittypes.csv |
| RELOAD | 1.67 | upgrade_unittypes.csv |
| BUILDTIME | 111 | upgrade_unittypes.csv |

### 修改依据
- 日本E14海军整体属性=中国同级×0.9，高波級对标Ch052d
- HP: 16000×0.9=14400 / DAMAGE: 1000×0.9=900 / RANGE: 26×0.9=23.4→23

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — DestroyerTakanamiUpgradeEpoch14行

---

## 第2次修改 — 2026-07-14

**关联快照**: `进度快照\128-日本E14海军五舰成本×0.9.md`
**关联提交**: `26122f76`
**修改类型**: 数值调整（成本）

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME | 111 | upgrade_unittypes.csv |
| WOOD | 1100 | upgrade_unittypes.csv |
| GOLD | 1100 | upgrade_unittypes.csv |
| OIL | 1100 | upgrade_unittypes.csv |
| URANIUM | 900 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME | 90 | upgrade_unittypes.csv |
| WOOD | 990 | upgrade_unittypes.csv |
| GOLD | 990 | upgrade_unittypes.csv |
| OIL | 990 | upgrade_unittypes.csv |
| URANIUM | 0 | upgrade_unittypes.csv |

### 修改依据
- 成本统一为中国同级Ch052d×0.9
- Ch052d: BT=100/WOOD=1100/GOLD=1100/OIL=1100/URAN=0
- ×0.9: BT=90/WOOD=990/GOLD=990/OIL=990/URAN=0

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — DestroyerTakanamiUpgradeEpoch14行
