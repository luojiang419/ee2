# AirDefense / AIAirDefense / AMissileDefense 修改日志

> 三个固定式防空建筑（AirDefense地對空導彈、AIAirDefense地對空導彈AI版、AMissileDefense萨姆5防空导弹）

---

## 第1次修改 — 2026-05-31

**关联快照**: 待创建
**修改类型**: 数值调整

### 修改说明
三个E14固定式防空建筑统一平衡调整：HP提升到10000，攻击力统一为1000，射击间隔统一为0.75秒。

### 修改前数据 vs 修改后数据

#### AirDefense（地對空導彈）
| 属性 | 修改前 | 修改后 | 来源文件 |
|:-----|:------|:------|:--------|
| HP | 4500 | 10000 | upgrade_unittypes.csv:214 |
| DAMAGE | 620 | 1000 | upgrade_unittypes.csv:214 |
| RELOAD | 2.0s | 0.75s | upgrade_unittypes.csv:214 |

#### AIAirDefense（地對空導彈AI版）
| 属性 | 修改前 | 修改后 | 来源文件 |
|:-----|:------|:------|:--------|
| HP | 4500 | 10000 | upgrade_unittypes.csv:220 |
| DAMAGE | 720 | 1000 | upgrade_unittypes.csv:220 |
| RELOAD | 2.0s | 0.75s | upgrade_unittypes.csv:220 |

#### AMissileDefense（萨姆5防空导弹）
| 属性 | 修改前 | 修改后 | 来源文件 |
|:-----|:------|:------|:--------|
| HP | 12000 | 10000 | upgrade_unittypes.csv:681 |
| DAMAGE | 2000 | 1000 | upgrade_unittypes.csv:681 + radar.ddf:207 |
| RELOAD | 2.5s(CSV) / 3.0s(DDF) | 0.75s | upgrade_unittypes.csv:681 + radar.ddf:207 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — AirDefenseUpgradeEpoch14(AirDefense), AIAirDefenseEpoch14(AIAirDefense), AMissileDefenseUpgradeEpoch14(AMissileDefense)
- `EE2X_db/Units/radar.ddf` — AMissileDefenseEpoch14Attack升级块（覆盖CSV的攻击参数）

### 修改依据
- 需求: 玩家要求提升固定式防空建筑的战斗力
- 理由: 三个固定防空建筑统一到HP=10000、DMG=1000、RELOAD=0.75s，增强防空能力的同时保持一致性

### 已知影响
- AMissileDefense的HP从12000降到10000（小幅削弱），但射速从2.5-3.0s提升到0.75s（大幅增强DPS）
- AirDefense和AIAirDefense全面增强（HP翻倍+、伤害提升、射速提升）
- 仅影响E14时代，其他时代不变

---

## 第2次修改 — 2026-05-31

**关联快照**: 同上
**修改类型**: 数值调整（根据测试反馈修正）

### 修改说明
- AirDefense/AIAirDefense 射速从0.75s调回1.0s
- AMissileDefense 恢复原始值：HP=12000, DMG=2000, RELOAD=3.0s

### 修改前数据 vs 修改后数据

#### AirDefense / AIAirDefense
| 属性 | 修改前 | 修改后 | 来源文件 |
|:-----|:------|:------|:--------|
| RELOAD | 0.75s | 1.0s | upgrade_unittypes.csv:214/AIAirDefense:220 |

#### AMissileDefense（萨姆5防空导弹）
| 属性 | 修改前 | 修改后 | 来源文件 |
|:-----|:------|:------|:--------|
| HP | 10000 | 12000 | upgrade_unittypes.csv:681 |
| DAMAGE | 1000 | 2000 | upgrade_unittypes.csv:681 + radar.ddf:207 |
| RELOAD | 0.75s | 3.0s(DDF) / 2.5s(CSV) | upgrade_unittypes.csv:681 + radar.ddf:207 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — 三个建筑的E14升级行
- `EE2X_db/Units/radar.ddf` — AMissileDefenseEpoch14Attack升级块

### 修改依据
- 需求: 根据玩家反馈，AirDefense/AIAirDefense 0.75s射速过快，调整为1.0s；AMissileDefense恢复原始值
- 理由: AirDefense/AIAirDefense 1.0s射速配合HP=10000/DMG=1000仍比原版大幅增强；AMissileDefense作为最强固定防空保持原版高压制力
