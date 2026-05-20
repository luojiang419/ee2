# 基洛夫巡洋舰 修改日志

> 目录: 俄罗斯-海军-Kirov\

---

## 第1次修改 — 2026-05-18 21:15

**关联快照**: 进度快照\006-阶段二海军差异化完成.md
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 14500 | upgrade_unittypes.csv |
| DAMAGE | 1050 | upgrade_unittypes.csv |
| RANGE | 23 | upgrade_unittypes.csv |
| RELOAD | 2.2 | upgrade_unittypes.csv |
| LOS | 24 | upgrade_unittypes.csv |
| Speed | 1.6 | Yuanhang_Tao_13naval_units.ddf |
| 造价 | W1500/S800/G1500/U1500 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 12800 | upgrade_unittypes.csv |
| DAMAGE | 920 | upgrade_unittypes.csv |
| RANGE | 22 | upgrade_unittypes.csv |
| RELOAD | 2.4 | upgrade_unittypes.csv |
| LOS | 22 | upgrade_unittypes.csv |
| Speed | 1.15 | Yuanhang_Tao_13naval_units.ddf |
| 造价 | W1425/S760/G1425/U1425 | upgrade_unittypes.csv |

### 关联文件
- EE2X_db/TechTree/upgrade_unittypes.csv — kirovUpgradeEpoch14行
- EE2X_db/Units/Yuanhang_Tao_13naval_units.ddf — UnitType kirov NavalMove/LOS

### 修改依据
- 需求: 中美俄14时代单位调优方案 2.2节
- 理由: 俄罗斯海军弱项，HP最低，速度最慢，造价最便宜(-5%)

### 已知影响
- 俄罗斯海军弱势体现，但造价便宜可量产

---

## 第2次修改 — 2026-05-21

**关联快照**: `进度快照\040-Ch055TiconderogaKirov三舰HP增50成本增20.md`
**修改类型**: 数值调整

### 修改前数据 (全时代E11-E15)
| 属性 | E11 | E12 | E13 | E14 | E15 | 来源文件 |
|:-----|:---:|:---:|:---:|:---:|:---:|:--------|
| HP | 10000 | 12000 | 14000 | 12800 | 18000 | upgrade_unittypes.csv |
| WOOD | 1800 | 1800 | 1800 | 1425 | 1800 | upgrade_unittypes.csv |
| STONE | 1000 | 1000 | 1000 | 760 | 1000 | upgrade_unittypes.csv |
| GOLD | 1800 | 1800 | 1800 | 1425 | 1800 | upgrade_unittypes.csv |
| OIL | 1800 | 1800 | 0 | 0 | 0 | upgrade_unittypes.csv |
| URANIUM | 0 | 0 | 1800 | 1425 | 1800 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | E11 | E12 | E13 | E14 | E15 | 来源文件 |
|:-----|:---:|:---:|:---:|:---:|:---:|:--------|
| HP | **15000** | **18000** | **21000** | **19200** | **27000** | upgrade_unittypes.csv |
| WOOD | **2160** | **2160** | **2160** | **1710** | **2160** | upgrade_unittypes.csv |
| STONE | **1200** | **1200** | **1200** | **912** | **1200** | upgrade_unittypes.csv |
| GOLD | **2160** | **2160** | **2160** | **1710** | **2160** | upgrade_unittypes.csv |
| OIL | **2160** | **2160** | 0 | 0 | 0 | upgrade_unittypes.csv |
| URANIUM | 0 | 0 | **2160** | **1710** | **2160** | upgrade_unittypes.csv |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — 第1127-1131行 (kirovUpgradeEpoch11/12/13/14/15)

### 修改依据
- 需求: 基洛夫级巡洋舰 HP+50%, 成本+20%
- 理由: 提升俄罗斯基洛夫级的生存能力和战场价值，成本微增平衡

### 已知影响
- HP增幅与Ch055/Ticonderoga同步
- 全时代生效（E11-E15）
