# China_T99A 修改日志

> 目录: `中国-陆军-China_T99A\`

---

## 第1次修改 — 2026-05-19 09:00

**关联快照**: `进度快照\011-阶段三陆军坦克差异化完成.md`
**修改类型**: 数值调整（三国差异化）+ 升级块独立

### 修改前数据 (2026-05-19)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | 5100 | upgrade_unittypes.csv:871 |
| CSV Damage | 430 | upgrade_unittypes.csv:871 |
| CSV Range | 15 | upgrade_unittypes.csv:871 |
| CSV Reload | 3.0 | upgrade_unittypes.csv:871 |
| DDF升级块引用 | T99AEpoch14Attack/Move | 共用轻型坦克块 |
| DDF 基础HP | 5300 | Chinese_army_lujun.ddf:527 |
| DDF 基础Speed | 1.75 | Chinese_army_lujun.ddf:550 |
| popCount | 2 | Chinese_army_lujun.ddf:524 |
| CSV 造价(木/金/油/铀) | 550/550/165/550 | upgrade_unittypes.csv:871 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | **5300** | upgrade_unittypes.csv:871 |
| CSV Damage | **450** | upgrade_unittypes.csv:871 |
| CSV Range | **16** | upgrade_unittypes.csv:871 |
| CSV Reload | 3.0 | 不变 |
| DDF升级块引用 | **China_T99AEpoch14Attack/Move** | 独立MBT块 |
| DDF E14 areaDamageRadius | **2.5** | Chinese_army_lujun.ddf:1908 |
| DDF E14 Speed | **1.8** | Chinese_army_lujun.ddf:1915 |
| DDF E14 angSpeed | **70** | Chinese_army_lujun.ddf:1915 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — China_T99AUpgradeEpoch14(行871) + Epoch15(行872)
- `EE2X_db/Units/Chinese_army_lujun.ddf` — UnitType China_T99A(行515-555) + 新增 China_T99AEpoch14Attack(行1905-1910) + China_T99AEpoch14Move(行1912-1917)

### 修改依据
- 需求: 中国主战坦克=进攻型MBT，强火力、远射程、高机动
- 理由: 与T99A(轻型)差异化定位——China_T99A是中国主力MBT，应有更强的战斗属性

### 已知影响
- E14/E15 China_T99A成为三国MBT中伤害最高(450)、射程最远(16)、速度最快(1.8)的单位
- 升级块独立于T99A，后续可单独调校中国MBT线
