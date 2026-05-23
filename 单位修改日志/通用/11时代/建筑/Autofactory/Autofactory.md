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

---

## 第2次修改 — 2026-05-24 20:30

**关联快照**: (无，直接修复)
**修改类型**: [数值调整 - 修复]

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| RallyPlacementFlags | (缺失) | EE2X_db.zip 中 Yuanhang_720_units.ddf:19687 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| RallyPlacementFlags | ( Resources \| Fortress \| Tower \| Terrain ) | EE2X_db.zip 中 Yuanhang_720_units.ddf:19687 |

### 关联文件
- `game-metadata/EE2X_db/Units/Yuanhang_720_units.ddf` — 19687行（工作数据库始终有此行）
- `Empire Earth II/zips_ee2x/EE2X_db.zip` — 重新打包修复

### 修改依据
- 问题: 其他开发者在后续操作中重新打包ZIP时，工作数据库的RallyPlacementFlags未同步到游戏ZIP，导致集结点功能丢失
- 修复: 从工作数据库重新打包完整ZIP，恢复RallyPlacementFlags

### 已知影响
- 汽车工厂集结点功能恢复，无其他影响

---

## 第3次修改 — 2026-05-24

**关联快照**: `进度快照\068-同步其他开发者最新参数.md`
**修改类型**: [修复 - 同步后恢复]

### 修改前数据 (同步后丢失)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| RallyPlacementFlags | (缺失) | Yuanhang_720_units.ddf:19687 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| RallyPlacementFlags | ( Resources \| Fortress \| Tower \| Terrain ) | Yuanhang_720_units.ddf:19687 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType Autofactory properties 块, 行19687

### 修改依据
- 原因: 同步其他开发者最新参数时(046)，Yuanhang_720_units.ddf 被覆盖，丢失了之前添加的 RallyPlacementFlags
- 修复: 在 Autofactory UnitType 的 properties 块中重新添加 RallyPlacementFlags = ( Resources \| Fortress \| Tower \| Terrain )

### 已知影响
- 汽车工厂集结点功能恢复，可右键设置集结点到资源/堡垒/塔/地形
