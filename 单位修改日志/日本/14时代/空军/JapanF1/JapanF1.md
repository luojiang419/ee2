# JapanF1 (日本F-1支援战斗机) 修改日志

> 目录: `日本/14时代/空军/JapanF1\`

---

## 第1次修改 — 2026-07-16 22:51

**关联快照**: `进度快照\131-日本E14空军对标中国.md`
**修改类型**: 数值调整（其他飞机/CAS：对标中国JH7A，成本×1.10、伤害×1.10）

### 修改前数据 (2026-07-16 22:44)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME (E14) | 80 | upgrade_unittypes.csv:1412 |
| WOOD/GOLD/OIL/URANIUM (E14) | 550/550/165/0 | upgrade_unittypes.csv:1412 |
| 攻击块引用 (E14) | JH7A14Attack (中国共用块, damage=1800) | upgrade_unittypes.csv:1412 |
| 科技树 TIME / W/G/Oil/U | 70 / 450/450/200/450 | dbtechtreenode.csv:546 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME (E14) | 88 (=JH7A 80×1.10) | upgrade_unittypes.csv:1412 |
| WOOD/GOLD/OIL/URANIUM (E14) | 495/495/495/0 (=JH7A 450/450/450/0×1.10) | upgrade_unittypes.csv:1412 |
| 攻击块引用 (E14) | JapanF1E14Attack (新建, damage=1980=1800×1.10) | upgrade_unittypes.csv:1412 |
| 科技树 TIME / W/G/Oil/U | 77 / 495/495/220/495 (=中国×1.10) | dbtechtreenode.csv:546 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — JapanF1UpgradeEpoch14行(1412)
- `EE2X_db/TechTree/dbtechtreenode.csv` — JapanF1节点行(546)
- `EE2X_db/Units/Chinese_army.ddf` — 新增 UpgradeAbilities JapanF1E14Attack 块(克隆JH7A14Attack, damage 1800→1980)

### 修改依据
- 需求: 日本E14其他飞机成本比中国高10%、伤害高10%
- 对标: JH7A (中国飞豹战斗轰炸机, CloseAirSupport)

### 已知影响
- 对地攻击伤害从与中国持平(1800)提升至1980

### 备份
- pre: `backup\EE2X_db-173-日本E14空军对标中国-pre.zip`
- runtime: `backup\EE2X_db-174-日本E14空军修改后完整ZIP-runtime.zip`
