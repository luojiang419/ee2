# American_M1A2 修改日志

> 目录: `美国-陆军-American_M1A2\`

---

## 第1次修改 — 2026-05-19 09:00

**关联快照**: `进度快照\011-阶段三陆军坦克差异化完成.md`
**修改类型**: 数值调整（三国差异化）+ 升级块独立

### 修改前数据 (2026-05-19)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | 5100 | upgrade_unittypes.csv:886 |
| CSV Damage | 430 | upgrade_unittypes.csv:886 |
| CSV Range | 15 | upgrade_unittypes.csv:886 |
| CSV Reload | 3.0 | upgrade_unittypes.csv:886 |
| DDF升级块引用 | T99AEpoch14Attack/Move | 共用中国升级块 |
| DDF 基础HP | 5300 | American_army_lujun.ddf:390 |
| DDF 基础Speed | 1.75 | American_army_lujun.ddf:403 |
| popCount | 2 | American_army_lujun.ddf:387 |
| CSV 造价(木/金/油/铀) | 550/550/165/550 | upgrade_unittypes.csv:886 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | **5000** | upgrade_unittypes.csv:886 |
| CSV Damage | **420** | upgrade_unittypes.csv:886 |
| CSV Range | 15 | 不变 |
| CSV Reload | **2.7** | upgrade_unittypes.csv:886 |
| DDF升级块引用 | **M1A2Epoch14Attack/Move** | 美国独立块 |
| DDF E14 areaDamageRadius | **1.5** | American_army_lujun.ddf:1258 |
| DDF E14 Speed | 1.75 | 不变 |
| DDF E14 angSpeed | **90** | American_army_lujun.ddf:1265 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — American_M1A2UpgradeEpoch14(行886) + Epoch15(行887)
- `EE2X_db/Units/American_army_lujun.ddf` — UnitType American_M1A2(行378-409) + 新增 M1A2Epoch14Attack(行1255-1260) + M1A2Epoch14Move(行1262-1268)

### 修改依据
- 需求: 美国MBT=全能灵活，快装填，平衡属性
- 理由: American_M1A2体现"全能均衡"——快装填(2.7s)、灵活转向(90)、中等HP和伤害

### 已知影响
- American_M1A2是三国MBT中最"舒适"的选择——装填最快、转向最灵活
- 伤害和HP均为中等，无极端短板
