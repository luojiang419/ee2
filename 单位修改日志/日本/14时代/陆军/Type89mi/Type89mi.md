# Type89mi (日本89式装甲战斗车) 修改日志

> 目录: `日本/14时代/陆军/Type89mi\`

---

## 第1次修改 — 2026-07-15 22:40

**关联快照**: `进度快照\130-日本E14陆军坦克火炮对标中国.md`
**修改类型**: 数值调整（对标中国ZTQ15：成本×0.9；伤害保持不变——用户确认）

### 修改前数据 (2026-07-15 22:29)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| 科技树 TIME | 35 | dbtechtreenode.csv:550 |
| 科技树 F/W/G/Oil/Uran | 400/550/550/400/0 | dbtechtreenode.csv:550 |
| DDF damage | 30 (未改动) | Yuanhang_720_units.ddf Type89mi块 |
| DDF HitPoints | 4700 (未改动) | Yuanhang_720_units.ddf Type89mi块 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| 科技树 TIME | 32 (=ZTQ15 35×0.9四舍五入) | dbtechtreenode.csv:550 |
| 科技树 F/W/G/Oil/Uran | 0/405/405/225/405 (=ZTQ15 450/450/250/450×0.9, 资源结构对齐中国) | dbtechtreenode.csv:550 |
| DDF damage | 30 (保持不变) | — |

### 关联文件
- `EE2X_db/TechTree/dbtechtreenode.csv` — Type89mi节点行(550)
- 注: 本单位无upgrade_unittypes.csv升级行，全部参数在DDF+科技树节点

### 修改依据
- 需求: 日本E14坦克工厂单位对标中国同级：成本低10%
- 对标单位: ZTQ15 (中国15式轻坦, E13坦克工厂同槽位)
- 伤害不套用×0.95：Type89mi是机炮(damage=30, reload=0.2, DPS=150)，ZTQ15是坦克炮(damage=400, reload=3, DPS=133)，武器类型不同且日本DPS本已略高，机械套用400×0.95=380会产生DPS1900的超级单位。经用户确认保持30

### 已知影响
- 生产成本结构从"粮/木/金/油"变为对齐中国的"木/金/油/铀"
- 战斗参数完全未变

### 备份
- pre: `backup\EE2X_db-171-日本E14陆军坦克火炮对标中国-pre.zip`
- runtime: `backup\EE2X_db-172-日本E14陆军修改后完整ZIP-runtime.zip`
