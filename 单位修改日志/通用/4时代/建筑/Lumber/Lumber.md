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

