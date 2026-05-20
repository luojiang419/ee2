# BT2 修改日志

> 目录: `俄罗斯-12时代-陆军-BT2\`

---

## 第1次修改 — 2026-05-19 11:04

**关联快照**: `进度快照\013-E12二战坦克差异化完成.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-19 11:04)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| angSpeed | 40 | Yuanhang_720_units.ddf:6761 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| angSpeed | 160 | Yuanhang_720_units.ddf:6761 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType BT2 (行6761)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行768, [upArmoredCar_12]

### 修改依据
- 需求: 方案文档《坦克五类分级与国家特色》— BT2分类为Armored car，俄罗斯装甲车"serviceable but less refined"
- 理由: angSpeed提升至装甲车档位(160)，略低于美国M3(180)，体现俄罗斯装甲车不如西方灵活的定位

### 已知影响
- BT2转弯速度160，低于M3(180)，符合俄罗斯装甲车"less refined than Western wheeled vehicles"定位
