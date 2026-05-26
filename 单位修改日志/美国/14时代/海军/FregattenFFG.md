# 星座级护卫舰 修改日志

> 目录: `美国-海军-FregattenFFG\`

---

## 第1次修改 — 2026-05-18 15:30

**关联快照**: `进度快照\001-中美俄14时代海陆空单位调优方案.md`
**修改类型**: 数值调整 + 功能改造

### 修改前数据 (2026-05-18 15:30)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 9000 | upgrade_unittypes.csv |
| DAMAGE | 700 | upgrade_unittypes.csv |
| RANGE | 22 | upgrade_unittypes.csv |
| RELOAD | 2 | upgrade_unittypes.csv |
| LOS | 22 | upgrade_unittypes.csv |
| BUILDTIME | 90 | upgrade_unittypes.csv |
| Speed | 1.7 | Yuanhang_Tao_13naval_units.ddf (NavalMove) |
| 粮食 | 650 | upgrade_unittypes.csv |
| 木材 | 950 | upgrade_unittypes.csv |
| 石头 | 650 | upgrade_unittypes.csv |
| 黄金 | 950 | upgrade_unittypes.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP | 10500 | upgrade_unittypes.csv |
| DAMAGE | 600 | upgrade_unittypes.csv + DDF FregattenFFGEpoch14Attack |
| RANGE | 18 | upgrade_unittypes.csv + DDF |
| RELOAD | 0.5 | upgrade_unittypes.csv + DDF (近防炮速射) |
| LOS | 26 | upgrade_unittypes.csv (宙斯盾雷达优势) |
| BUILDTIME | 70 | upgrade_unittypes.csv |
| Speed | 2.1 | DDF FregattenFFGEpoch14Attack (最高速) |
| 粮食 | 400 | upgrade_unittypes.csv |
| 木材 | 650 | upgrade_unittypes.csv |
| 石头 | 450 | upgrade_unittypes.csv |
| 黄金 | 650 | upgrade_unittypes.csv |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — FregattenFFGUpgradeEpoch14 行
- `EE2X_db/Units/Yuanhang_Tao_13naval_units.ddf` — UnitType FregattenFFG + 新增 UpgradeAbilities FregattenFFGEpoch14Attack
- `EE2X_db/Simulation/dbcombat_unittypeadjust.csv` — 新增对空/海/陆克制条目

### 修改依据
- 需求: 将美国星座级护卫舰改造为纯防空舰艇
- 理由: 美国海军最强——护卫舰同样为全球最优，HP最高(10500)、速度最快(2.1)、LOS最远(26，宙斯盾系统优势)

### 已知影响
- FregattenFFG在E14时代失去通用海战能力（对海军伤害仅30%）
- FregattenFFG在E14时代拥有三国防空护卫舰中最强的探测和机动能力
- 与美国海军全球最强的定位一致

---

## 第2次修改 — 2026-05-18 18:30

**关联快照**: `进度快照\003-三舰全线AA改造完成.md`
**修改类型**: 数值调整 + RPS类型变更 + 全线改造

### 修改范围
- 从仅E14扩展为 **E11-E15全时代** AA防空护卫舰
- RPS类型从 `Destroyer` 改为 `AntiAircraft`
- 属性按E11基值×1.15逐代递增

### 修改后数据（E11-E15全线）

| 时代 | HP | DAMAGE | RANGE | RELOAD | SPEED |
|:-----|:----|:-------|:------|:--------|:------|
| E11 | 6200 | 380 | 13 | 0.5 | 1.40 |
| E12 | 7150 | 435 | 15 | 0.5 | 1.60 |
| E13 | 8200 | 505 | 17 | 0.5 | 1.85 |
| E14 | 9450 | 580 | 20 | 0.5 | 2.15 |
| E15 | 10850 | 665 | 23 | 0.5 | 2.45 |

> 每级递增约15%，三国最强AA护卫舰

### 关联文件
- `upgrade_unittypes.csv` — FregattenFFGUpgradeEpoch11~Epoch15 (5行)
- `Yuanhang_Tao_13naval_units.ddf` — rps=AntiAircraft + FregattenFFGEpoch11~Epoch15Attack (5个块)

### 已知影响
- 与美国海军全球最强的定位一致——星座级为三国最强AA护卫舰

---

## 第3次修改 — 2026-05-18 19:10

**关联快照**: `进度快照\004-RPS克制扩展完成.md`
**修改类型**: RPS克制表扩展

### 修改内容
- 新增 **201条** RPS克制条目(E11-E15)，对空 **200%(2x)**，对海/陆 **0%**
- 关联文件: `EE2X_db/Simulation/dbcombat_unittypeadjust.csv`

---

## 第4次修改 — 2026-05-19 20:00

**修改类型**: 弹药类型变更

### 修改前数据
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| missileName | "fkjqAmmo" | Yuanhang_Tao_13naval_units.ddf | 5133 (FregattenFFGEpoch14Attack) |

### 修改后数据
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| missileName | "ThaadRocket" | Yuanhang_Tao_13naval_units.ddf | 5133 (FregattenFFGEpoch14Attack) |

### 关联文件
- `EE2X_db/Units/Yuanhang_Tao_13naval_units.ddf` — 行5133

### 修改依据
- 需求: 三国E14防空护卫舰弹药类型统一改为防空导弹
- 理由: fkjqAmmo为近防炮速射弹药，改为ThaadRocket防空导弹更符合护卫舰防空导弹发射的视觉和定位

### 已知影响
- 仅影响E14 AA升级块的弹药外观/轨迹，伤害/射程/装填等数值不变

---

## 第5次修改 — 2026-05-19 21:00

**关联快照**: 待生成
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| reloadTime | 0.5 | Yuanhang_Tao_13naval_units.ddf | 5133 (FregattenFFGEpoch14Attack) |

### 修改后数据
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| reloadTime | 1.0 | Yuanhang_Tao_13naval_units.ddf | 5133 (FregattenFFGEpoch14Attack) |

### 关联文件
- `EE2X_db/Units/Yuanhang_Tao_13naval_units.ddf` — 行5133

### 修改依据
- 需求: 三国防空护卫舰E14射速太快，降低一倍
- 理由: reloadTime从0.5s提升到1.0s，射速减半，配合防空导弹弹药更合理

### 已知影响
- FregattenFFG E14 DPS减半（580/1.0=580），防空效率降低但仍保持克制优势

---

## 第6次修改 — 2026-05-19 21:30

**关联快照**: 待生成
**修改类型**: Bug修复 + 弹药类型变更

### 修改前数据
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| rps | AntiAircraft | Yuanhang_Tao_13naval_units.ddf | 5059 (FregattenFFG UnitType) |
| missileName | "ThaadRocket" | Yuanhang_Tao_13naval_units.ddf | 5133 (FregattenFFGEpoch14Attack) |

### 修改后数据
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| rps | Anti_Aircraft | Yuanhang_Tao_13naval_units.ddf | 5059 |
| missileName | "A054Rocket" | Yuanhang_Tao_13naval_units.ddf | 5133 |

### 关联文件
- `EE2X_db/Units/Yuanhang_Tao_13naval_units.ddf` — 行5059, 5133

### 修改依据
- **RPS修复**: DDF中 `rps = AntiAircraft` 与克制表 `dbcombat.csv` 中的 `Anti_Aircraft` 不匹配，飞机完全打不动
- **弹药更换**: ThaadRocket视觉为近防炮，改用主力舰通用 A054Rocket

### 已知影响
- RPS修正后飞机可正常造成伤害（CAS=95%, AirSup=110%, Bomber=150%）
- 防空护卫舰对飞机的200%克制不受影响

---

## 第7次修改 — 2026-05-20 13:15

**关联快照**: 进度快照\021-E14超级主力舰三倍属性.md
**修改类型**: 数值调整 — 超级主力舰三倍属性

### E14修改前数据
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| HP | 9,450 | upgrade_unittypes.csv | 1022 |
| LOS | 24 | upgrade_unittypes.csv | 1022 |
| DAMAGE | 580 | upgrade_unittypes.csv; Yuanhang_Tao_13naval_units.ddf | CSV:1022; DDF:5133 |
| RANGE | 20 | upgrade_unittypes.csv; Yuanhang_Tao_13naval_units.ddf | CSV:1022; DDF:5133 |
| SPEED | 2.60 | Yuanhang_Tao_13naval_units.ddf | 5134 |
| angSpeed | 85 | Yuanhang_Tao_13naval_units.ddf | 5134 |
| BUILDTIME | 70 | upgrade_unittypes.csv | 1022 |
| Food | 400 | upgrade_unittypes.csv | 1022 |
| Wood | 650 | upgrade_unittypes.csv | 1022 |
| Stone | 450 | upgrade_unittypes.csv | 1022 |
| Gold | 650 | upgrade_unittypes.csv | 1022 |
| Oil | 650 | upgrade_unittypes.csv | 1022 |
| Uranium | 650 | upgrade_unittypes.csv | 1022 |

### E14修改后数据 (×3)
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| HP | 28,350 | upgrade_unittypes.csv | 1022 |
| LOS | 72 | upgrade_unittypes.csv | 1022 |
| DAMAGE | 1,740 | upgrade_unittypes.csv; Yuanhang_Tao_13naval_units.ddf | CSV:1022; DDF:5133 |
| RANGE | 60 | upgrade_unittypes.csv; Yuanhang_Tao_13naval_units.ddf | CSV:1022; DDF:5133 |
| SPEED | 7.80 | Yuanhang_Tao_13naval_units.ddf | 5134 |
| angSpeed | 255 | Yuanhang_Tao_13naval_units.ddf | 5134 |
| BUILDTIME | 210 | upgrade_unittypes.csv | 1022 |
| Food | 1,200 | upgrade_unittypes.csv | 1022 |
| Wood | 1,950 | upgrade_unittypes.csv | 1022 |
| Stone | 1,350 | upgrade_unittypes.csv | 1022 |
| Gold | 1,950 | upgrade_unittypes.csv | 1022 |
| Oil | 1,950 | upgrade_unittypes.csv | 1022 |
| Uranium | 1,950 | upgrade_unittypes.csv | 1022 |

### 关联文件
- EE2X_db/TechTree/upgrade_unittypes.csv — FregattenFFGUpgradeEpoch14行 (行1022)
- EE2X_db/Units/Yuanhang_Tao_13naval_units.ddf — FregattenFFGEpoch14Attack块 (行5133-5134)
- Empire Earth II/zips_ee2x/EE2X_db.zip — 双路径同步更新

### 修改依据
- 需求: 佩里级护卫舰升级为超级主力舰，所有属性×3
- 理由: E14时代中美俄各一艘主力舰升级为超级舰

### 已知影响
- 装填时间 (reloadTime=1.0) 保持不变
- 与中国Ch054A(×3)持平，俄Type22350则血厚攻强但速度慢

---

## 第8次修改 — 2026-05-20 13:23

**关联快照**: 进度快照\022-超级主力舰倍率回滚.md
**修改类型**: 数值回滚

### 回滚说明
第7次修改（超级主力舰×3）撤销，全部属性恢复至原始值（倍率=1）。

### 当前E14数据 (还原后)
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| HP | 9,450 | upgrade_unittypes.csv | 1022 |
| DAMAGE | 580 | Yuanhang_Tao_13naval_units.ddf | 5133 |
| RANGE | 20 | Yuanhang_Tao_13naval_units.ddf | 5133 |
| SPEED | 2.60 | Yuanhang_Tao_13naval_units.ddf | 5134 |
| angSpeed | 85 | Yuanhang_Tao_13naval_units.ddf | 5134 |
| BUILDTIME | 70 | upgrade_unittypes.csv | 1022 |

### 修改依据
- 需求: 倍率全部调为1，恢复原始属性

---

## 第9次修改 — 2026-05-20 13:32

**关联快照**: 进度快照\023-E14超级主力舰三倍属性v2.md
**修改类型**: 数值调整 — 超级主力舰×3(重新应用)

### E14修改后数据 (×3)
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| HP | 28,350 | upgrade_unittypes.csv | 1022 |
| DAMAGE | 1,740 | Yuanhang_Tao_13naval_units.ddf | 5133 |
| RANGE | 60 | Yuanhang_Tao_13naval_units.ddf | 5133 |
| SPEED | 7.80 | Yuanhang_Tao_13naval_units.ddf | 5134 |
| angSpeed | 255 | Yuanhang_Tao_13naval_units.ddf | 5134 |
| BUILDTIME | 210 | upgrade_unittypes.csv | 1022 |
| 全资源 | ×3 | upgrade_unittypes.csv | 1022 |

### 修改依据
- 需求: 重新确认×3方案，佩里级全属性三倍

---

## 第10次修改 — 2026-05-21

**关联快照**: `进度快照\039-潜艇高伤低HP+护卫舰成本减半.md`
**修改类型**: 数值调整 — 成本减50%

### 修改前数据 (E14)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| 全资源成本 | 650 | upgrade_unittypes.csv:1022 |

### 修改后数据 (E14)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| 全资源成本 | 325 | upgrade_unittypes.csv:1022 |

### 修改依据
- 需求: 美防空护卫舰成本资源减少50%

### 资源修正 — 13:35
- Oil: 1,950 → **3,000** / Uranium: 1,950 → **3,000** (E14特殊资源各3000)

### 攻击力调整 — 17:17
- 基准2300，中国2350 / 美国2250 / 俄罗斯2450

---

## 第11次修改 — 2026-05-26

**关联快照**: `进度快照\103-新版启动器设置页新增960x540分辨率.md`
**修改类型**: RPS类型调整

### 修改前数据
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| rps | Destroyer | Yuanhang_Tao_13naval_units.ddf | 5070 |

### 修改后数据
| 属性 | 值 | 来源文件 | 行号 |
|:-----|:---|:--------|:-----|
| rps | AntiAircraft | Yuanhang_Tao_13naval_units.ddf | 5070 |

### 修改依据
- 需求: 三艘防空护卫舰RPS类型从Destroyer改回AntiAircraft
- 理由: 防空护卫舰应使用防空类型以正确参与RPS克制体系
