# BMP3 修改日志

> 目录: `俄罗斯-13时代-陆军-BMP3\`

---

## 第1次修改 — 2026-05-19 16:00

**关联快照**: `进度快照\015-E13冷战步战与两栖单位差异化.md`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 4700 | Yuanhang_720_units.ddf:3910 |
| damage | 30 | Yuanhang_720_units.ddf:3931 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 4200 | Yuanhang_720_units.ddf:3910 |
| damage | 40 | Yuanhang_720_units.ddf:3931 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType BMP3 (行3910, 3931)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行417, [upHelicopter_13]

### 修改依据
- 需求: 方案文档《E13冷战步战与两栖单位调优方案》— Bradley vs BMP3 差异化
- 理由: BMP3装甲薄(铝+钢复合但车臣/中东战损率高)，HP降至4200。但火力应是最强IFV——100mm 2A70炮(可发炮射导弹)+30mm 2A72机炮+7.62mm PKT，damage从30→40体现双炮火力优势
- 历史锚点: BMP-3 — 100mm+30mm双炮武器站，1987年服役，火力过剩但防护不足

### 已知影响
- BMP3(俄) vs Bradley(美): 更脆(4200<4500)但火力更猛(40>30) — 火力型 vs 生存型
- 苏联IFV哲学: 先敌开火，先敌摧毁
