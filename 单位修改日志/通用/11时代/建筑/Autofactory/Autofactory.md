# Autofactory 修改日志

> 目录: `通用-11时代-建筑-Autofactory\`

---

## 第1次修改 — 2026-05-21 15:30

**关联快照**: `进度快照\051-autofactory-rallypoint.md`
**修改类型**: [数值调整]

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| RallyPlacementFlags | (缺失) | Yuanhang_720_units.ddf:19686 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| RallyPlacementFlags | ( Resources \| Fortress \| Tower \| Terrain ) | Yuanhang_720_units.ddf:19687 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType Autofactory properties 块, 行19687

### 修改依据
- 需求: 汽车工厂(Autofactory)生产挖掘机、卡车等经济单位，但无法设置集结点
- 理由: 缺少 RallyPlacementFlags 属性，添加后集结点功能可用。参考兵营(barracks.ddf:22)、马厩(stable.ddf:21)等标准生产建筑的配置

### 已知影响
- Autofactory 现在可以右键设置集结点，集结点可设在资源/堡垒/塔/地形上
- 不影响 Autofactory 生产的任何单位的属性
