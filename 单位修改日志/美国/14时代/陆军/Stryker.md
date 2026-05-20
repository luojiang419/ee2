# Stryker 修改日志

> 目录: `美国-陆军-Stryker\`

---

## 第1次修改 — 2026-05-19 09:00

**关联快照**: `进度快照\011-阶段三陆军坦克差异化完成.md`
**修改类型**: 数值调整（三国差异化）+ 升级块独立

### 修改前数据 (2026-05-19)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | 1900 | upgrade_unittypes.csv:820 |
| CSV Damage | 37 | upgrade_unittypes.csv:820 |
| CSV Range | 14 | upgrade_unittypes.csv:820 |
| CSV Reload | 0.2 | upgrade_unittypes.csv:820 |
| DDF升级块引用 | ZSL92Epoch14Attack | 共用中国升级块 |
| DDF 基础Speed | 2.0 | American_army_lujun.ddf:35 |
| DDF 基础angSpeed | 180 | American_army_lujun.ddf:35 |
| DDF 基础HP | 2000 | American_army_lujun.ddf:16 |
| popCount | 2 | American_army_lujun.ddf:12 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | **1850** | upgrade_unittypes.csv:820 |
| CSV Damage | **36** | upgrade_unittypes.csv:820 |
| CSV Range | 14 | 不变 |
| CSV Reload | **0.17** | upgrade_unittypes.csv:820 |
| DDF升级块引用 | **StrykerEpoch14Attack** | 美国独立块 |
| DDF E14 Speed | **2.2** | American_army_lujun.ddf:1232 |
| DDF E14 angSpeed | **140** | American_army_lujun.ddf:1232 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — StrykerUpgradeEpoch14(行820) + Epoch15(行821)
- `EE2X_db/Units/American_army_lujun.ddf` — UnitType Stryker(行4-52) + 新增 StrykerEpoch14Attack(行1227-1236)

### 修改依据
- 需求: 美国装甲车=最快最灵活，快速装填
- 理由: 美国Stryker强调机动性和操控性，最高速度(2.2)、最灵活转向(140)、最快射速(0.17)

### 已知影响
- Stryker成为三国装甲车中速度最快、转向最灵活、射速最快的单位
- HP最低(1850)反映了"轻快脆"的设计定位
