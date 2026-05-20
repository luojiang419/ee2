# M18Hellcat 修改日志

> 目录: `美国-12时代-陆军-M18Hellcat\`

---

## 第1次修改 — 2026-05-19 14:30

**关联快照**: `进度快照\014-E12坦歼与历史投影修正.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-19 14:30)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 2000 | Yuanhang_720_units.ddf:11347 |
| damage | 250 | Yuanhang_720_units.ddf:11366 |
| speed | 1.8 | Yuanhang_720_units.ddf:11367 |
| angSpeed | 40 | Yuanhang_720_units.ddf:11367 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 1800 | Yuanhang_720_units.ddf:11347 |
| damage | 240 | Yuanhang_720_units.ddf:11366 |
| speed | 1.9 | Yuanhang_720_units.ddf:11367 |
| angSpeed | 70 | Yuanhang_720_units.ddf:11367 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType M18Hellcat (行11347, 11366, 11367)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行838, [upLightArtillery_12]

### 修改依据
- 需求: 方案文档《E12二战坦克历史投影差异化方案》— M18是二战最快履带车辆(88km/h公路)，"速度即装甲"
- 理由: 修改前与M10完全相同(HP2000/dmg250/spd1.8/ang40)，完全无法体现M18独特的历史地位
  - speed=1.9：E12履带坦歼最速(仅次于装甲车2.0)
  - HP=1800：仅13mm装甲，全E12坦歼最低，速度换生存
  - angSpeed=70：轻量化底盘+高功重比，转弯应最优
  - damage=240：76mm炮略低于M10的3英寸(76.2mm)炮
- 历史锚点: M18 Hellcat — 二战最快履带车辆，"Speed is armor"学说的纯粹体现

### 已知影响
- M18 vs M10 清晰差异化：M18更快(1.9>1.7)+更灵活(70>50)+更脆(1800<2000)+伤害略低(240<250)
- 玩家选择：追求极限速度选M18，追求稳定输出选M10
