# AMissileDefense 修改日志

> 目录: `通用-建筑-AMissileDefense\`
> 中文名: 萨姆防空导弹 (E12萨姆1→E13萨姆2→E14萨姆5→E15霍克)
> 类型: Building, DDF: radar.ddf

---

## 第1次修改 — 2026-05-20 20:30

**关联快照**: `进度快照\031-萨姆防空导弹攻击力递增.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-20 20:30)
| 属性 | E12 | E13 | E14 | E15 | 来源文件 |
|:-----|:---|:---|:---|:---|:--------|
| DDF Attack | 250 | 250 | 3000 | 250 | radar.ddf:187,197,207,218 |
| DDF Range | 20 | 30 | 30 | 30 | radar.ddf |
| DDF Reload | 5 | 3 | 3 | 3 | radar.ddf |

### 修改后数据
| 属性 | E12 | E13 | E14 | E15 | 来源文件 |
|:-----|:---|:---|:---|:---|:--------|
| DDF Attack | **800** | **1500** | **2300** | **3000** | radar.ddf:187,197,207,218 |
| DDF Range | 20 | 30 | 30 | 30 | radar.ddf (不变) |
| DDF Reload | 5 | 3 | 3 | 3 | radar.ddf (不变) |

### 关联文件
- `EE2X_db/Units/radar.ddf` — UpgradeAbilities AMissileDefenseEpoch12/13/14/15Attack
- `Empire Earth II\zips_ee2x\EE2X_db.zip` — 游戏实际读取的 ZIP
- `backup\EE2X_db-016-sam-attack-progression-pre\` — 修改前备份

### 修改依据
- 需求: 用户确认攻击力递增 E12=800, E13=1500, E14=2300, E15=3000
- 理由: 原数值不合理（E12/E13/E15 均为 250，E14 异常 3000），修正为平滑递增曲线

### 已知影响
- 萨姆防空导弹在 E12-E15 攻击力显著提升，防空能力增强
- E12 攻击力从 250 提升到 800（+220%），需关注早期平衡
- E14 从 3000 降至 2300，实际是削弱
