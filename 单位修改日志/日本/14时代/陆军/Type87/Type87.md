# Type87 (日本87式装甲侦察车) 修改日志

> 目录: `日本/14时代/陆军/Type87\`

---

## 第1次修改 — 2026-07-15 22:40

**关联快照**: `进度快照\130-日本E14陆军坦克火炮对标中国.md`
**修改类型**: 数值调整（对标中国ZSL92：成本×0.9、伤害×0.95）

### 修改前数据 (2026-07-15 22:29)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DAMAGE (E14) | 37 | upgrade_unittypes.csv:840 |
| BUILDTIME (E14) | 35 | upgrade_unittypes.csv:840 |
| FOOD/WOOD/STONE/GOLD (E14) | 200/300/175/250 | upgrade_unittypes.csv:840 |
| 攻击块引用 (E14) | ZSL92Epoch14Attack (damage=30, 中国共用块) | upgrade_unittypes.csv:840 |
| 科技树 TIME | 30 | dbtechtreenode.csv:547 |
| 科技树 F/W/S/G | 250/250/250/250 | dbtechtreenode.csv:547 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DAMAGE (E14) | 36 (=ZSL92 38×0.95) | upgrade_unittypes.csv:840 |
| BUILDTIME (E14) | 32 (=35×0.9) | upgrade_unittypes.csv:840 |
| FOOD/WOOD/STONE/GOLD (E14) | 180/270/158/225 (=中国×0.9) | upgrade_unittypes.csv:840 |
| 攻击块引用 (E14) | Type87Epoch14Attack (新建, damage=29=30×0.95四舍五入) | upgrade_unittypes.csv:840 |
| 科技树 TIME | 27 (=30×0.9) | dbtechtreenode.csv:547 |
| 科技树 F/W/S/G | 225/225/225/225 (=中国×0.9) | dbtechtreenode.csv:547 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — Type87UpgradeEpoch14行(840)
- `EE2X_db/TechTree/dbtechtreenode.csv` — Type87节点行(547)
- `EE2X_db/Units/Yuanhang_Tao_13zhuangjia_units.ddf` — 新增 UpgradeAbilities Type87Epoch14Attack 块(155-162行，克隆自Chinese_army_lujun.ddf的ZSL92Epoch14Attack，仅damage 30→29)

### 修改依据
- 需求: 日本E14坦克工厂/火炮工厂单位对标中国同级：成本低10%、伤害低5%
- 对标单位: ZSL92 (中国09式轮式步兵战车, LightMounted同级)
- 原引用中国共用块ZSL92Epoch14Attack导致DDF层伤害与中国完全相同，故新建日本专属块

### 已知影响
- Type87 E14伤害从与中国持平(30)变为低5%(29)
- 其他时代(E11-E13/E15)行未改动

### 备份
- pre: `backup\EE2X_db-171-日本E14陆军坦克火炮对标中国-pre.zip`
- runtime: `backup\EE2X_db-172-日本E14陆军修改后完整ZIP-runtime.zip`
