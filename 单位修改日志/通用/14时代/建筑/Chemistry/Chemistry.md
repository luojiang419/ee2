# Chemistry(化工厂) 修改日志

> 目录: `通用-14时代-建筑-Chemistry\`

---

## 第1次修改 — 2026-05-20 19:00

**关联快照**: `进度快照\029-提炼厂化工厂进驻人口调整.md`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| numOfSlots | 6 | Yuanhang_720_units.ddf:18913 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| numOfSlots | 25 | Yuanhang_720_units.ddf:18913 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf:18913` — Chemistry UnitType > Garrison > numOfSlots
- `EE2X_db/TechTree/dbtechtreenode.csv:11` — 科技树节点(E13解锁, 造价50F/300W/300S/200Uranium)
- `EE2X_db/TechTree/upgrade_unittypes.csv:538-539` — CSV升级行(已注释, 不生效)

### 修改依据
- 需求: 化工厂进驻人口从6格提升至25格
- 理由: 扩大资源生产效率上限，6农民×0.8=4.8/秒 → 25农民×0.8=20/秒

### 已知影响
- 化工厂满进驻产出从4.8 Uranium/秒提升至20 Uranium/秒
- 与UraniumMine(铀提炼厂)的人口上限产生差异化(UraniumMine仍为6格)
- 无科技树或升级联动影响
