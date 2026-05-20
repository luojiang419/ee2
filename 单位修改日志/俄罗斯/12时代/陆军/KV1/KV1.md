# KV1 修改日志

> 目录: `俄罗斯-12时代-陆军-KV1\`

---

## 第1次修改 — 2026-05-19 11:04

**关联快照**: `进度快照\013-E12二战坦克差异化完成.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-19 11:04)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 2500 | Yuanhang_720_units.ddf:7175 |
| angSpeed | 40 | Yuanhang_720_units.ddf:7195 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 2700 | Yuanhang_720_units.ddf:7175 |
| angSpeed | 55 | Yuanhang_720_units.ddf:7195 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType KV1 (行7175, 7195)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行773, [upLightTnak_12]

### 修改依据
- 需求: 方案文档《坦克五类分级与国家特色》— KV1分类为Main battle tank，俄罗斯MBT"good frontal fighting and punch"
- 理由: HP提升体现俄罗斯MBT强调防护的特点(2700>M4的2600)。angSpeed=55略低于M4(60)体现俄罗斯坦克不强调舒适性

### 已知影响
- KV1作为俄罗斯E12 MBT，HP高于美国M4(2700>2600)但转弯略慢(55<60)
- 符合"Russian line should reward direct engagement and punish overexposing flanks"设计理念
