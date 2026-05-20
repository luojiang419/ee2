# Am_M1A1 修改日志

> 目录: `美国-陆军-Am_M1A1\`

---

## 第1次修改 — 2026-05-19 09:00

**关联快照**: `进度快照\011-阶段三陆军坦克差异化完成.md`
**修改类型**: 数值调整（三国差异化）+ 升级块独立

### 修改前数据 (2026-05-19)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | 4800 | upgrade_unittypes.csv:877 |
| CSV Damage | 400 | upgrade_unittypes.csv:877 |
| CSV Range | 15 | upgrade_unittypes.csv:877 |
| CSV Reload | 3.0 | upgrade_unittypes.csv:877 |
| DDF升级块引用 | T99AEpoch14Attack/Move | 共用中国升级块 |
| DDF 基础HP | 5000 | American_army_lujun.ddf:186 |
| DDF 基础Speed | 1.4 | American_army_lujun.ddf:209 |
| popCount | 2 | American_army_lujun.ddf:183 |
| CSV 造价(木/金/油/铀) | 500/500/500/150 | upgrade_unittypes.csv:877 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | **4600** | upgrade_unittypes.csv:877 |
| CSV Damage | **390** | upgrade_unittypes.csv:877 |
| CSV Range | 15 | 不变 |
| CSV Reload | **2.7** | upgrade_unittypes.csv:877 |
| DDF升级块引用 | **Am_M1A1Epoch14Attack/Move** | 美国独立块 |
| DDF E14 areaDamageRadius | **1.5** | American_army_lujun.ddf:1241 |
| DDF E14 Speed | **1.75** | American_army_lujun.ddf:1248 |
| DDF E14 angSpeed | **90** | American_army_lujun.ddf:1248 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — Am_M1A1UpgradeEpoch14(行877) + Epoch15(行878)
- `EE2X_db/Units/American_army_lujun.ddf` — UnitType Am_M1A1(行174-215) + 新增 Am_M1A1Epoch14Attack(行1238-1243) + Am_M1A1Epoch14Move(行1245-1251)
- `EE2X_db/Units/Yuanhang_Tao_13zhuangjia_units.ddf` — UnitType American_M1A1(行1651-1682, USAM1A1升级用)

### 修改依据
- 需求: 美国轻型坦克=全能灵活，快速装填，良好操控
- 理由: 美式"灵活好用"——最快装填(2.7s)、最佳转向(90)、精确射击(范围伤害仅1.5)

### 已知影响
- Am_M1A1成为三国轻型坦克中装填最快(2.7s)、转向最灵活(90)的单位
- 范围伤害最小(1.5)反映精确炮控而非大范围溅射
- USAM1A1(美国E13两栖坦克)也使用此升级块
