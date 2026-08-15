# Lumber 修改日志

> 目录: `通用-4时代-建筑-Lumber\`
> 注: Lumber(伐木场)出现于 E4、E10（据总索引），本日志按首个时代归档

---

## 第1次修改 — 2026-08-15 18:35

**关联快照**: `进度快照\134-伐木场光环全局化奇迹化.md`
**关联备份**: #180 (pre) / #181 (runtime)
**修改类型**: [数值调整]

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| LumberBonus.EffectVisualGlow.range | SelfClaimedTerritoryUnitIsIn | dbareaeffects_unittype.ddf:1193 |
| LumberBonus.EffectResourceGatherRate.range | SelfClaimedTerritoryUnitIsIn | dbareaeffects_unittype.ddf:1203 |
| Lumber.attributes | (无 attributes 行) | Yuanhang_720_units.ddf:573124 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| LumberBonus.EffectVisualGlow.range | Global | dbareaeffects_unittype.ddf:1193 |
| LumberBonus.EffectResourceGatherRate.range | Global | dbareaeffects_unittype.ddf:1203 |
| Lumber.attributes | [IsWonder] | Yuanhang_720_units.ddf:573124 |

### 关联文件
- `EE2X_db/AreaEffects/dbareaeffects_unittype.ddf` — DbAreaEffectInfo LumberBonus 块（行1187-1213），2处range改为Global
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType Lumber 块，块尾新增 attributes = [IsWonder]（行573124）

### 修改依据
- 需求: 伐木场木材采集光环（EffectResourceGatherRate, scale=1.5, mask=Citizens, player=Self）从"己方领土内生效"改为"任意领土生效"，且加成不可叠加，避免玩家无限建造伐木场堆加成，使其类似奇迹建筑
- 理由: range=SelfClaimedTerritoryUnitIsIn 限定了工人必须在己方领土内才享受+50%木材采集；AreaEffect系统无防叠加字段，唯一现成机制是奇迹属性 attributes=[IsWonder]（天坛HeavenTemple等103个奇迹同款，每玩家限建）

### 已知影响
- 己方所有市民(Citizens)在任意领土采集木材均享受×1.5加成（视觉金光同步全局，OwnerOnly=true仅自己可见）
- Lumber 变为奇迹建筑（EXE硬编码行为，黑盒）：预期每玩家限建1个；可能纳入奇迹竞赛/胜利条件体系，需实测确认
- AI 若原计划建造多个伐木场，将受奇迹限额约束（aips 不在工作库，影响待测）
- QuarryBonus/GranaryBonus 等其他采集光环未改，仍为领土内生效

---

## 第2次修改 — 2026-08-15 19:10

**关联快照**: `进度快照\135-伐木场光环RadiusFromUnit修复.md`
**关联备份**: #182 (pre) / #183 (runtime)
**修改类型**: [数值调整 - 修复]

### 修改前数据（第1次修改后、修复前）
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| LumberBonus.EffectVisualGlow.range | Global | dbareaeffects_unittype.ddf:1193 |
| LumberBonus.EffectResourceGatherRate.range | Global | dbareaeffects_unittype.ddf:1204 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| LumberBonus.EffectVisualGlow.range | RadiusFromUnit | dbareaeffects_unittype.ddf:1193 |
| LumberBonus.EffectVisualGlow.radius | 10000 | dbareaeffects_unittype.ddf:1194 |
| LumberBonus.EffectResourceGatherRate.range | RadiusFromUnit | dbareaeffects_unittype.ddf:1204 |
| LumberBonus.EffectResourceGatherRate.radius | 10000 | dbareaeffects_unittype.ddf:1205 |
| Lumber.attributes | [IsWonder]（保留不变） | Yuanhang_720_units.ddf:573124 |

### 关联文件
- `EE2X_db/AreaEffects/dbareaeffects_unittype.ddf` — DbAreaEffectInfo LumberBonus 块，2处range改RadiusFromUnit+各插入radius行

### 修改依据
- 需求: 修复用户测试反馈"领土内外均无任何加成效果"（#181 runtime 异常）
- 理由: range=Global 对采集类 effect（EffectResourceGatherRate）无先例，引擎不触发导致光环完全失效（连领土内也失效）。诊断排除 IsWonder 嫌疑——90+个奇迹建筑（bigben/stonehenge/HeavenTemple等）均 IsWonder+AreaEffect 并存且正常。改为参照 AIResourcePower（#177已调过的采集光环）的正宗先例组合：RadiusFromUnit + radius=500，本处取 radius=10000 覆盖全图实现"任意领土生效"

### 已知影响
- 己方所有市民在距伐木场10000格范围内采集木材+50%（≈全图任意领土）
- radius 10000 为推测安全值（先例为500），超大地图边缘是否覆盖待测试确认
- IsWonder 防叠加机制保留，与90+奇迹同款

