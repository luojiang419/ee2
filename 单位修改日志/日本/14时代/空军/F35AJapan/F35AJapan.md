# F35AJapan (日本F-35A战斗机) 修改日志

> 目录: `日本/14时代/空军/F35AJapan\`

---

## 第1次修改 — 2026-07-16 22:51

**关联快照**: `进度快照\131-日本E14空军对标中国.md`
**修改类型**: 数值调整（多用途飞机：对标中国J20S，成本×1.10、伤害×0.90）

### 修改前数据 (2026-07-16 22:44)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DDF damage | 900 | Yuanhang_Tao_13air_units.ddf:4366 |
| DDF HitPoints | 2200 (未改动, 与J20S持平) | Yuanhang_Tao_13air_units.ddf:4357 |
| 科技树 TIME / W/G/Oil/U | 90 / 750/750/750/400 | dbtechtreenode.csv:544 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DDF damage | 2070 (=J20S 2300×0.90) | Yuanhang_Tao_13air_units.ddf:4366 |
| 科技树 TIME / W/G/Oil/U | 88 / 825/825/825/440 (=J20S 80×1.10 / 750/750/750/400×1.10) | dbtechtreenode.csv:544 |

### 关联文件
- `EE2X_db/TechTree/dbtechtreenode.csv` — F35AJapan节点行(544)
- `EE2X_db/Units/Yuanhang_Tao_13air_units.ddf` — UnitType F35AJapan 的 abilities Attack行(4366)
- 注: 本单位无upgrade_unittypes.csv升级行，全部参数在DDF+科技树节点

### 修改依据
- 需求: 日本E14多用途飞机成本比中国高10%、伤害低10%
- 对标: J20S (中国E14隐身战机, DDF damage=2300, 节点TIME80成本750/750/750/400)
- 修改前伤害900远低于J20S，用户确认按对标提升至2070

### 已知影响
- F35AJapan伤害提升2.3倍(900→2070)，成为日本最强E14战机
- 同文件中F35AUK/F35AItaly/F35AKorea/F35AGreek的相同攻击行未改动(仍为900)

### 备份
- pre: `backup\EE2X_db-173-日本E14空军对标中国-pre.zip`
- runtime: `backup\EE2X_db-174-日本E14空军修改后完整ZIP-runtime.zip`
