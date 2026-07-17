# Japanf15 (日本F-15战斗机) 修改日志

> 目录: `日本/14时代/空军/Japanf15\`

---

## 第1次修改 — 2026-07-16 22:51

**关联快照**: `进度快照\131-日本E14空军对标中国.md`
**修改类型**: 数值调整（多用途飞机：对标中国J16，成本×1.10、伤害×0.90）

### 修改前数据 (2026-07-16 22:44)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME (E14) | 90 | upgrade_unittypes.csv:1416 |
| WOOD/GOLD/OIL/URANIUM (E14) | 650/650/450/450 | upgrade_unittypes.csv:1416 |
| 攻击块引用 (E14) | J1614Attack (中国共用块, damage=900) | upgrade_unittypes.csv:1416 |
| 科技树 TIME / W/G/Oil/U | 80 / 600/600/400/400 | dbtechtreenode.csv:543 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME (E14) | 99 (=J16 90×1.10) | upgrade_unittypes.csv:1416 |
| WOOD/GOLD/OIL/URANIUM (E14) | 715/715/495/495 (=J16 650/650/450/450×1.10) | upgrade_unittypes.csv:1416 |
| 攻击块引用 (E14) | Japanf15Epoch14Attack (新建, damage=810=900×0.90) | upgrade_unittypes.csv:1416 |
| 科技树 TIME / W/G/Oil/U | 88 / 660/660/440/440 (=中国×1.10) | dbtechtreenode.csv:543 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — Japanf15UpgradeEpoch14行(1416)
- `EE2X_db/TechTree/dbtechtreenode.csv` — Japanf15节点行(543)
- `EE2X_db/Units/Chinese_army.ddf` — 新增 UpgradeAbilities Japanf15Epoch14Attack 块(克隆J1614Attack, damage 900→810)

### 修改依据
- 需求: 日本E14多用途飞机成本比中国高10%、伤害低10%
- 对标: J16 (中国E14多用途, rps=Animal)

### 已知影响
- 伤害从与中国持平(900)降为810

### 备份
- pre: `backup\EE2X_db-173-日本E14空军对标中国-pre.zip`
- runtime: `backup\EE2X_db-174-日本E14空军修改后完整ZIP-runtime.zip`
