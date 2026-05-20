# Oilref(提炼厂) 修改日志

> 目录: `通用-14时代-建筑-Oilref\`

---

## 第1次修改 — 2026-05-20 19:00

**关联快照**: `进度快照\029-提炼厂化工厂进驻人口调整.md`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| numOfSlots | 6 | Yuanhang_720_units.ddf:18626 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| numOfSlots | 25 | Yuanhang_720_units.ddf:18626 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf:18626` — Oilref UnitType > Garrison > numOfSlots
- `EE2X_db/TechTree/dbtechtreenode.csv:13` — 科技树节点(E10解锁, 造价50F/300W/300S/200Oil)
- `EE2X_db/TechTree/upgrade_unittypes.csv:534-535` — CSV升级行(已注释, 不生效)

### 修改依据
- 需求: 提炼厂进驻人口从6格提升至25格
- 理由: 扩大资源生产效率上限，6农民×0.8=4.8/秒 → 25农民×0.8=20/秒

### 已知影响
- 提炼厂满进驻产出从4.8 Oil/秒提升至20 Oil/秒
- 与OilRig(石油钻塔)的人口上限产生差异化(OilRig仍为6格)
- 无科技树或升级联动影响

---

## 第2次修改 — 2026-05-20 (ZIP同步修复)

**关联快照**: `进度快照\029-提炼厂化工厂进驻人口调整.md`
**修改类型**: 部署修复

### 问题
DDF修改正确(numOfSlots=25)但游戏内仍显示6格进驻。根因: 只改了`game-metadata\EE2X_db\`工作目录，未更新`Empire Earth II\zips_ee2x\EE2X_db.zip`。

### 修复
将修改后的 `Yuanhang_720_units.ddf` 重新打包到 `EE2X_db.zip`，游戏验证通过。

### 经验教训
详见 `地2方案文档\数据库修改生效链路与ZIP同步规则.md`
