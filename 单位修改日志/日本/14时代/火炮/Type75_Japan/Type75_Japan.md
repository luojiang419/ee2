# Type75_Japan (日本75式火箭炮) 修改日志

> 目录: `日本/14时代/火炮/Type75_Japan\`

---

## 第1次修改 — 2026-07-15 22:40

**关联快照**: `进度快照\130-日本E14陆军坦克火炮对标中国.md`
**修改类型**: 数值调整（对标中国PHL_03：成本×0.9、伤害×0.95）+ 射程bug修复

### 修改前数据 (2026-07-15 22:29)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DDF damage | 150 | Yuanhang_Tao_13zhuangjia_units.ddf:4859(原行号) |
| DDF range | 2 (bug: 小于minRange=16, 理论上无法开火) | Yuanhang_Tao_13zhuangjia_units.ddf:4859 |
| DDF HitPoints | 1100 (未改动) | Yuanhang_Tao_13zhuangjia_units.ddf:4838 |
| 科技树 TIME | 42 | dbtechtreenode.csv:553 |
| 科技树 S/G/Oil/Uran | 400/600/300/600 | dbtechtreenode.csv:553 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DDF damage | 95 (=PHL_03 100×0.95) | Yuanhang_Tao_13zhuangjia_units.ddf:4874(新行号) |
| DDF range | 25 (=对齐PHL_03, bug修复, 用户确认) | Yuanhang_Tao_13zhuangjia_units.ddf:4874 |
| 科技树 TIME | 38 (=42×0.9四舍五入) | dbtechtreenode.csv:553 |
| 科技树 S/G/Oil/Uran | 290/435/217/435 (=PHL_03 322/483/241/483×0.9四舍五入) | dbtechtreenode.csv:553 |

### 关联文件
- `EE2X_db/TechTree/dbtechtreenode.csv` — Type75_Japan节点行(553)
- `EE2X_db/Units/Yuanhang_Tao_13zhuangjia_units.ddf` — UnitType Type75_Japan 的 abilities Attack行
- 注: 本单位无upgrade_unittypes.csv升级行，全部参数在DDF+科技树节点

### 修改依据
- 需求: 日本E14火炮工厂单位对标中国同级：成本低10%、伤害低5%
- 对标单位: PHL_03 (解放军PHL03火箭炮, E14火箭炮同槽位, HP800/damage100/range25)
- 原成本反而比中国高24%(600 vs 483)，原伤害150比中国高50%但range=2导致实际无法开火
- range=2疑似录入错误，经用户确认修复为25（与中国一致）

### 已知影响
- 该单位从"参数异常无法开火"变为正常可用的火箭炮
- HP保持1100（高于中国800，用户未要求调整）

### 备份
- pre: `backup\EE2X_db-171-日本E14陆军坦克火炮对标中国-pre.zip`
- runtime: `backup\EE2X_db-172-日本E14陆军修改后完整ZIP-runtime.zip`
