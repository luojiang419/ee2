# Tractor 修改日志

> 目录: `通用/11时代/工程机械/Tractor/`
> 游戏内名称: Tractor (拖拉机/收割机)
> 来源: Autofactory, E11/E13

---

## 第1次修改 — 2026-05-21

**关联快照**: `进度快照\038-伐木机挖掘机收割机采集速率10倍化.md`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| foodRate | 0.7 | Yuanhang_720_units.ddf:19573 |
| carryLimit | 30 | Yuanhang_720_units.ddf:19576 |
| farmCarryLimit | 30 | Yuanhang_720_units.ddf:19577 |
| farmRate | 0.9 | Yuanhang_720_units.ddf:19578 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| foodRate | 7.0 | Yuanhang_720_units.ddf:19573 |
| carryLimit | 300 | Yuanhang_720_units.ddf:19576 |
| farmCarryLimit | 300 | Yuanhang_720_units.ddf:19577 |
| farmRate | 9.0 | Yuanhang_720_units.ddf:19578 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType Tractor, GatherFarm块

### 修改依据
- 需求: 收割机食物/农场速率提升10倍，每次采集300再放回仓库
- 理由: 机械化采集单位效率强化

### 已知影响
- 野外采集食物从0.7→7.0（10倍），农场速率从0.9→9.0（10倍）
- 单次携带从30→300，农场携带从30→300

---

## 第2次修改 — 2026-05-21

**关联快照**: `进度快照\040-汽车厂6单位取消碰撞+挖掘机石油铀.md`
**修改类型**: 数值调整 — 取消碰撞体积

### 修改内容
| 属性 | 旧值 | 新值 | 来源文件 | 行号 |
|:-----|:---|:---|:--------|:----|
| mass | 1 | **0** | Yuanhang_720_units.ddf | 19561 |
