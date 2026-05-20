# BTR80 修改日志

> 目录: `俄罗斯-陆军-BTR80\`

---

## 第1次修改 — 2026-05-19 09:00

**关联快照**: `进度快照\011-阶段三陆军坦克差异化完成.md`
**修改类型**: 数值调整（三国差异化）+ 升级块独立

### 修改前数据 (2026-05-19)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | 1900 | upgrade_unittypes.csv:826 |
| CSV Damage | 37 | upgrade_unittypes.csv:826 |
| CSV Range | 14 | upgrade_unittypes.csv:826 |
| CSV Reload | 0.2 | upgrade_unittypes.csv:826 |
| DDF升级块引用 | ZSL92Epoch14Attack | 共用中国升级块 |
| DDF 基础Speed | 1.75 | Russian_army_lujun.ddf:35 |
| DDF 基础angSpeed | 70 | Russian_army_lujun.ddf:35 |
| DDF 基础HP | 2000 | Russian_army_lujun.ddf:15 |
| popCount | 2 | Russian_army_lujun.ddf:12 |
| CSV 造价(食/木/石/金) | 150/220/130/180 | upgrade_unittypes.csv:826 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | **2100** | upgrade_unittypes.csv:826 |
| CSV Damage | **35** | upgrade_unittypes.csv:826 |
| CSV Range | 14 | 不变 |
| CSV Reload | 0.20 | 不变 |
| DDF升级块引用 | **BTR80Epoch14Attack** | 俄罗斯独立块 |
| DDF E14 Speed | **1.9** | Russian_army_lujun.ddf:1245 |
| DDF E14 angSpeed | **60** | Russian_army_lujun.ddf:1245 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — BTR80UpgradeEpoch14(行826) + Epoch15(行827)
- `EE2X_db/Units/Russian_army_lujun.ddf` — UnitType BTR80(行4-49) + 新增 BTR80Epoch14Attack(行1241-1250)

### 修改依据
- 需求: 俄罗斯装甲车=高耐久、慢但便宜
- 理由: 俄罗斯路线强调耐久和性价比——HP最高(2100)、价格最低、但速度(1.9)和射速(0.20)均低于中美

### 已知影响
- BTR80成为三国装甲车中HP最高(2100)、造价最便宜的单位
- 伤害最低(35)、射速最慢(0.20)反映俄式"粗糙实用"设计
