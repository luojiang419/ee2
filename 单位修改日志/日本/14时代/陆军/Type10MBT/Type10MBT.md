# Type10MBT (日本10式主战坦克) 修改日志

> 目录: `日本/14时代/陆军/Type10MBT\`

---

## 第1次修改 — 2026-07-15 22:40

**关联快照**: `进度快照\130-日本E14陆军坦克火炮对标中国.md`
**修改类型**: 数值调整（对标中国China_T99A：成本×0.9、伤害×0.95、HP×0.95）

### 修改前数据 (2026-07-15 22:29)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP (E14) | 5100 | upgrade_unittypes.csv:927 |
| DAMAGE (E14) | 430 | upgrade_unittypes.csv:927 |
| BUILDTIME (E14) | 70 | upgrade_unittypes.csv:927 |
| WOOD/GOLD/OIL/URANIUM (E14) | 550/550/165/550 | upgrade_unittypes.csv:927 |
| 科技树 TIME | 35 | dbtechtreenode.csv:549 |
| 科技树 W/G/Oil/Uran | 500/500/300/500 | dbtechtreenode.csv:549 |
| 科技树 TECHPTS | 2 | dbtechtreenode.csv:549 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HP (E14) | 10070 (=China_T99A 10600×0.95, 用户确认) | upgrade_unittypes.csv:927 |
| DAMAGE (E14) | 950 (=China_T99A 1000×0.95) | upgrade_unittypes.csv:927 |
| BUILDTIME (E14) | 63 (=70×0.9) | upgrade_unittypes.csv:927 |
| WOOD/GOLD/OIL/URANIUM (E14) | 1080/1350/900/900 (=中国1200/1500/1000/1000×0.9) | upgrade_unittypes.csv:927 |
| 科技树 TIME | 32 (=35×0.9四舍五入) | dbtechtreenode.csv:549 |
| 科技树 W/G/Oil/Uran | 450/450/270/450 (=中国×0.9) | dbtechtreenode.csv:549 |
| 科技树 TECHPTS | 2 (保持不变, 用户确认不对标中国的30) | dbtechtreenode.csv:549 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — Type10MBTUpgradeEpoch14行(927)
- `EE2X_db/TechTree/dbtechtreenode.csv` — Type10MBT节点行(549)

### 修改依据
- 需求: 日本E14坦克工厂单位对标中国同级：成本低10%、伤害低5%
- 对标单位: China_T99A (中国炎黄重型坦克, E11重型坦克同槽位)
- 中国重坦E13/E14曾被大幅强化(HP10600/DMG1000/成本1200/1500/1000/1000)，日本重坦此前仍是基础值，本次全面对标
- HP同步调整为×0.95经用户确认（否则成本翻倍但HP仅为中国48%）

### 已知影响
- Type10MBT战力大幅提升(HP 5100→10070, DMG 430→950)，成本同步大涨(550级→1350级)
- E14时代日本重坦从"廉价弱鸡"变为"接近中国炎黄的准重坦"
- 其他时代行未改动

### 备份
- pre: `backup\EE2X_db-171-日本E14陆军坦克火炮对标中国-pre.zip`
- runtime: `backup\EE2X_db-172-日本E14陆军修改后完整ZIP-runtime.zip`
