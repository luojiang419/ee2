# IS2 修改日志

> 目录: `俄罗斯-12时代-陆军-IS2\`

---

## 第1次修改 — 2026-05-19 11:04

**关联快照**: `进度快照\013-E12二战坦克差异化完成.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-19 11:04)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| speed | 1.7 | Yuanhang_720_units.ddf:7352 |
| angSpeed | 40 | Yuanhang_720_units.ddf:7352 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| speed | 1.5 | Yuanhang_720_units.ddf:7352 |
| angSpeed | 50 | Yuanhang_720_units.ddf:7352 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType IS2 (行7352)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行775, [upLightTnak_12]

### 修改依据
- 需求: 方案文档《坦克五类分级与国家特色》— IS2分类为Heavy tank，俄罗斯重坦"slow, punishing, durable, high-alpha bias"
- 理由: 原speed=1.7等同于MBT速度，重坦必须有明显速度惩罚。从1.7降到1.5，angSpeed降到50

### 已知影响
- IS2速度从1.7降到1.5，与KV2同为重坦档位
- HP=3500保持不变(已远高于MBT档)，pop=4体现重型占用
- 与KV2形成重坦线梯度：KV2(HP 3100/spd 1.5)→IS2(HP 3500/spd 1.5)→IS3(HP 3700/spd 1.45)
