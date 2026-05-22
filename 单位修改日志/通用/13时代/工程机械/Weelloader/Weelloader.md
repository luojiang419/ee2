# Weelloader 修改日志

> 目录: `通用/13时代/工程机械/Weelloader/`
> 游戏内名称: Weelloader (挖掘机)
> 来源: Autofactory, E13

---

## 第1次修改 — 2026-05-21

**关联快照**: `进度快照\038-伐木机挖掘机收割机采集速率10倍化.md`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| carryLimit | 30 | Yuanhang_720_units.ddf:19496 |
| stoneRate | 0.7 | Yuanhang_720_units.ddf:19497 |
| goldRate | 0.7 | Yuanhang_720_units.ddf:19498 |
| tinRate | 0.5 | Yuanhang_720_units.ddf:19499 |
| ironRate | 0.5 | Yuanhang_720_units.ddf:19500 |
| saltpeterRate | 0.7 | Yuanhang_720_units.ddf:19501 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| carryLimit | 300 | Yuanhang_720_units.ddf:19496 |
| stoneRate | 7.0 | Yuanhang_720_units.ddf:19497 |
| goldRate | 7.0 | Yuanhang_720_units.ddf:19498 |
| tinRate | 5.0 | Yuanhang_720_units.ddf:19499 |
| ironRate | 5.0 | Yuanhang_720_units.ddf:19500 |
| saltpeterRate | 7.0 | Yuanhang_720_units.ddf:19501 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType Weelloader, GatherFarm块

### 修改依据
- 需求: 挖掘机全部资源采集速率提升10倍，每次采集300再放回仓库
- 理由: 机械化采集单位效率强化

### 已知影响
- 石材/黄金/硝石从0.7→7.0（10倍），锡/铁从0.5→5.0（10倍），单次携带从30→300
- 不影响修理速率(repairRate=100)

---

## 第2次修改 — 2026-05-21

**关联快照**: `进度快照\040-汽车厂6单位取消碰撞+挖掘机石油铀.md`
**修改类型**: 数值调整 — 取消碰撞体积 + 新增石油/铀采集

### 修改内容
| 属性 | 旧值 | 新值 | 来源文件 | 行号 |
|:-----|:---|:---|:--------|:----|
| mass | 1 | **0** | Yuanhang_720_units.ddf | 19481 |
| oilRate | — | **5.0** | Yuanhang_720_units.ddf | 新增 |
| uraniumRate | — | **5.0** | Yuanhang_720_units.ddf | 新增 |
