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
