# 提康德罗加巡洋舰 修改日志

> 目录: 美国-海军-Ticonderoga\

---

## 第1次修改 — 2026-05-18 21:15

**关联快照**: 进度快照\006-阶段二海军差异化完成.md
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 16000 | upgrade_unittypes.csv |
| DAMAGE | 1100 | upgrade_unittypes.csv |
| RANGE | 24 | upgrade_unittypes.csv |
| RELOAD | 2.0 | upgrade_unittypes.csv |
| LOS | 24 | upgrade_unittypes.csv |
| Speed | 1.7 | Yuanhang_Tao_13naval_units.ddf |
| 造价 | W1800/S1000/G1800/U1800 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 18400 | upgrade_unittypes.csv |
| DAMAGE | 1260 | upgrade_unittypes.csv |
| RANGE | 26 | upgrade_unittypes.csv |
| RELOAD | 1.7 | upgrade_unittypes.csv |
| LOS | 27 | upgrade_unittypes.csv |
| Speed | 1.35 | Yuanhang_Tao_13naval_units.ddf |
| 造价 | W1800/S1000/G1980/U1800 | upgrade_unittypes.csv |

### 关联文件
- EE2X_db/TechTree/upgrade_unittypes.csv — TiconderogaUpgradeEpoch14行
- EE2X_db/Units/Yuanhang_Tao_13naval_units.ddf — UnitType Ticonderoga NavalMove

### 修改依据
- 需求: 中美俄14时代单位调优方案 2.2节
- 理由: 美国精兵优势，HP最高+15%，伤害最高，射程最远，装填最快，造价+10%

### 已知影响
- 三国最强驱逐舰/巡洋舰，但造价最贵

---

## 第2次修改 — 2026-05-21

**关联快照**: `进度快照\040-Ch055TiconderogaKirov三舰HP增50成本增20.md`
**修改类型**: 数值调整

### 修改前数据 (全时代E11-E15)
| 属性 | E11 | E12 | E13 | E14 | E15 | 来源文件 |
|:-----|:---:|:---:|:---:|:---:|:---:|:--------|
| HP | 10000 | 12000 | 14000 | 18400 | 18000 | upgrade_unittypes.csv |
| WOOD | 1800 | 1800 | 1800 | 1800 | 1800 | upgrade_unittypes.csv |
| STONE | 1000 | 1000 | 1000 | 1000 | 1000 | upgrade_unittypes.csv |
| GOLD | 1800 | 1800 | 1800 | 1980 | 1800 | upgrade_unittypes.csv |
| OIL | 1800 | 1800 | 0 | 0 | 0 | upgrade_unittypes.csv |
| URANIUM | 0 | 0 | 1800 | 1800 | 1800 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | E11 | E12 | E13 | E14 | E15 | 来源文件 |
|:-----|:---:|:---:|:---:|:---:|:---:|:--------|
| HP | **15000** | **18000** | **21000** | **27600** | **27000** | upgrade_unittypes.csv |
| WOOD | **2160** | **2160** | **2160** | **2160** | **2160** | upgrade_unittypes.csv |
| STONE | **1200** | **1200** | **1200** | **1200** | **1200** | upgrade_unittypes.csv |
| GOLD | **2160** | **2160** | **2160** | **2376** | **2160** | upgrade_unittypes.csv |
| OIL | **2160** | **2160** | 0 | 0 | 0 | upgrade_unittypes.csv |
| URANIUM | 0 | 0 | **2160** | **2160** | **2160** | upgrade_unittypes.csv |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — 第1115-1119行 (TiconderogaUpgradeEpoch11/12/13/14/15)

### 修改依据
- 需求: 提康德罗加巡洋舰 HP+50%, 成本+20%
- 理由: 提升美国提康德罗加级的生存能力和战场价值，成本微增平衡

### 已知影响
- HP增幅与Ch055/Kirov同步
- 全时代生效（E11-E15）

---

## 第2次修改 — 2026-05-24

**关联快照**: `进度快照\071-驱逐舰HP射程攻击三国同步.md`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 22000 | Yuanhang_Tao_13naval_units.ddf:4648 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | **26000** | Yuanhang_Tao_13naval_units.ddf:4648 |

### 关联文件
- `EE2X_db/Units/Yuanhang_Tao_13naval_units.ddf:4648` — HitPoints

### 修改依据
- 需求: 美方055同级别巡洋舰HP→26000
- 理由: 三国大型驱逐舰/巡洋舰HP统一强化

### 已知影响
- 中方Ch055、俄方Kirov同步调整为HP=26000
