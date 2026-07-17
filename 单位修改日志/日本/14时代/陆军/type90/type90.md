# type90 (日本90式坦克) 修改日志

> 目录: `日本/14时代/陆军/type90\`

---

## 第1次修改 — 2026-07-15 22:40

**关联快照**: `进度快照\130-日本E14陆军坦克火炮对标中国.md`
**修改类型**: 数值调整（对标中国T99A：成本×0.9、伤害×0.95）

### 修改前数据 (2026-07-15 22:29)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DAMAGE (E14) | 400 | upgrade_unittypes.csv:921 |
| BUILDTIME (E14) | 70 | upgrade_unittypes.csv:921 |
| WOOD/GOLD/OIL/URANIUM (E14) | 500/500/500/150 | upgrade_unittypes.csv:921 |
| 科技树 TIME | 35 | dbtechtreenode.csv:548 |
| 科技树 W/G/Oil/Uran | 450/450/250/450 | dbtechtreenode.csv:548 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DAMAGE (E14) | 399 (=T99A 420×0.95) | upgrade_unittypes.csv:921 |
| BUILDTIME (E14) | 63 (=70×0.9) | upgrade_unittypes.csv:921 |
| WOOD/GOLD/OIL/URANIUM (E14) | 450/450/450/135 (=中国×0.9) | upgrade_unittypes.csv:921 |
| 科技树 TIME | 32 (=35×0.9四舍五入) | dbtechtreenode.csv:548 |
| 科技树 W/G/Oil/Uran | 405/405/225/405 (=中国×0.9) | dbtechtreenode.csv:548 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — type90UpgradeEpoch14行(921)
- `EE2X_db/TechTree/dbtechtreenode.csv` — type90节点行(548)

### 修改依据
- 需求: 日本E14坦克工厂单位对标中国同级：成本低10%、伤害低5%
- 对标单位: T99A (中国伏羲主战坦克, E11主战坦克同槽位)
- 攻击块共用T99AEpoch14Attack(damage=0不覆盖)，实际伤害走CSV，无需新建DDF块

### 已知影响
- HP保持4800与中国T99A持平（用户未要求调整）
- 其他时代行未改动

### 备份
- pre: `backup\EE2X_db-171-日本E14陆军坦克火炮对标中国-pre.zip`
- runtime: `backup\EE2X_db-172-日本E14陆军修改后完整ZIP-runtime.zip`
