# BT7 修改日志

> 目录: `俄罗斯-12时代-陆军-BT7\`

---

## 第1次修改 — 2026-05-19 11:04

**关联快照**: `进度快照\013-E12二战坦克差异化完成.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-19 11:04)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| rps | LightMounted | Yuanhang_720_units.ddf:6872 |
| speed | 2.0 | Yuanhang_720_units.ddf:6899 |
| angSpeed | 40 | Yuanhang_720_units.ddf:6899 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| rps | HeavyMounted | Yuanhang_720_units.ddf:6872 |
| speed | 1.85 | Yuanhang_720_units.ddf:6899 |
| angSpeed | 100 | Yuanhang_720_units.ddf:6899 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType BT7 (行6872, 6899)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行770, [upArmoredCar_12]

### 修改依据
- 需求: 方案文档《坦克五类分级与国家特色》— BT7分类为Light tank(RPS应为HeavyMounted)，俄罗斯轻坦"direct and aggressive"
- 理由: **RPS错误修复** — LightMounted是装甲车RPS，轻坦必须使用HeavyMounted。速度调整到轻坦档位，转弯略低于美国M24体现俄罗斯不精确的特点

### 已知影响
- RPS从LightMounted改为HeavyMounted后，BT7的克制关系从装甲车变为轻坦
- 与M24(speed=1.9, angSpeed=120)形成差异化：俄罗斯轻坦更直接但不如美国灵活
