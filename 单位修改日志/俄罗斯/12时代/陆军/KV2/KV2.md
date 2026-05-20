# KV2 修改日志

> 目录: `俄罗斯-12时代-陆军-KV2\`

---

## 第1次修改 — 2026-05-19 11:04

**关联快照**: `进度快照\013-E12二战坦克差异化完成.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-19 11:04)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 3000 | Yuanhang_720_units.ddf:7253 |
| speed | 1.6 | Yuanhang_720_units.ddf:7273 |
| angSpeed | 40 | Yuanhang_720_units.ddf:7273 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 3100 | Yuanhang_720_units.ddf:7253 |
| speed | 1.5 | Yuanhang_720_units.ddf:7273 |
| angSpeed | 50 | Yuanhang_720_units.ddf:7273 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType KV2 (行7253, 7273)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行774, [upLightTnak_12]

### 修改依据
- 需求: 方案文档《坦克五类分级与国家特色》— KV2分类为Heavy tank，需Low speed/Low traverse/Very high durability
- 理由: 原speed=1.6对照MBT无区分度，重坦应明显慢于MBT。angSpeed从40→50仍有降低但避免过度削弱

### 已知影响
- KV2速度从1.6降到1.5，与MBT(KV1=1.6)形成清晰的速度梯度
- HP微增至3100，拉开与KV1(2700)的中坦/重坦区别
- 保留throwUnits=true(溅射效果)
