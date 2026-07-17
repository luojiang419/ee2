# UniqueUnitJapanese3 (日本特色单位F-35舰载机) 修改日志

> 目录: `日本/14时代/空军/UniqueUnitJapanese3\`

---

## 第1次修改 — 2026-07-16 22:51

**关联快照**: `进度快照\131-日本E14空军对标中国.md`
**修改类型**: 数值调整（多用途飞机：对标中国J16，成本×1.10、伤害×0.90）

### 修改前数据 (2026-07-16 22:44)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME (E14) | 20 | upgrade_unittypes.csv:598 |
| WOOD/GOLD/OIL/URANIUM (E14) | 600/600/350/350 | upgrade_unittypes.csv:598 |
| 攻击块引用 (E14) | [Fighter_Improve_Reset J1614Attack] (damage=900) | upgrade_unittypes.csv:598 |
| 科技树节点 | Zuikaku舰载, 零成本, 不改动 | dbtechtreenode.csv:1868 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| BUILDTIME (E14) | 99 (=J16 90×1.10) | upgrade_unittypes.csv:598 |
| WOOD/GOLD/OIL/URANIUM (E14) | 715/715/495/495 (=J16×1.10) | upgrade_unittypes.csv:598 |
| 攻击块引用 (E14) | [Fighter_Improve_Reset UU_Japanese3E14Attack] (新建, damage=810) | upgrade_unittypes.csv:598 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — UU_Japanese3UpgradeEpoch14行(598)
- `EE2X_db/Units/Chinese_army.ddf` — 新增 UpgradeAbilities UU_Japanese3E14Attack 块(克隆J1614Attack, damage 900→810)

### 修改依据
- 需求: 日本E14多用途飞机成本比中国高10%、伤害低10%
- 对标: J16（中国UU_Chinese3无E14升级行，故对标J16）
- 生产建筑为Zuikaku航母，科技树节点零成本，成本调整全部在CSV升级行

### 已知影响
- BT从20大幅提高到99（原值远低于同级）
- 与F35AJapan同名F-35但为舰载版本，两者独立调整

### 备份
- pre: `backup\EE2X_db-173-日本E14空军对标中国-pre.zip`
- runtime: `backup\EE2X_db-174-日本E14空军修改后完整ZIP-runtime.zip`
