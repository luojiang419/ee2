# ZSL92 修改日志

> 目录: `中国-陆军-ZSL92\`

---

## 第1次修改 — 2026-05-19 09:00

**关联快照**: `进度快照\011-阶段三陆军坦克差异化完成.md`
**修改类型**: 数值调整（三国差异化）

### 修改前数据 (2026-05-19)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | 1900 | upgrade_unittypes.csv:814 |
| CSV Damage | 37 | upgrade_unittypes.csv:814 |
| CSV Range | 14 | upgrade_unittypes.csv:814 |
| CSV Reload | 0.2 | upgrade_unittypes.csv:814 |
| DDF E14 Speed | 2.0 | Chinese_army_lujun.ddf:97 |
| DDF E14 angSpeed | 80 | Chinese_army_lujun.ddf:97 |
| DDF 基础HP | 2000 | Chinese_army_lujun.ddf:12 |
| DDF 基础Speed | 1.6 | Chinese_army_lujun.ddf:31 |
| popCount | 2 | Chinese_army_lujun.ddf:9 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| CSV HP | **2000** | upgrade_unittypes.csv:814 |
| CSV Damage | **38** | upgrade_unittypes.csv:814 |
| CSV Range | **15** | upgrade_unittypes.csv:814 |
| CSV Reload | **0.19** | upgrade_unittypes.csv:814 |
| DDF E14 Speed | **2.1** | Chinese_army_lujun.ddf:97 |
| DDF E14 angSpeed | 80 | Chinese_army_lujun.ddf:97 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — ZSL92UpgradeEpoch14(行814) + ZSL92UpgradeEpoch15(行815)
- `EE2X_db/Units/Chinese_army_lujun.ddf` — UnitType ZSL92(行1-44) + ZSL92Epoch14Attack(行93-99)

### 修改依据
- 需求: 三国装甲车差异化——中国=进攻型，平衡机动和火力
- 理由: ZSL92作为中国装甲车定位为"快速实用"，在机动、火力和生存之间取平衡

### 已知影响
- E14/E15 装甲车对步兵的压制能力小幅提升(+1伤害, +1射程)
- 速度2.1仅次于美国Stryker(2.2)
