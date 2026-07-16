# canberraJapan (堪培拉轰炸机) 修改日志

> 目录: `日本/14时代/空军/canberraJapan\`

---

## 第1次修改 — 2026-07-16 22:51

**关联快照**: `进度快照\131-日本E14空军对标中国.md`
**修改类型**: 数值调整（轰炸机：对标中国Tu16Kitai，成本×1.10、伤害×1.10）

### 修改前数据 (2026-07-16 22:44)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DAMAGE (E14) | 1200 | upgrade_unittypes.csv:1422 |
| BUILDTIME (E14) | 33 | upgrade_unittypes.csv:1422 |
| WOOD/GOLD/OIL/URANIUM (E14) | 1000/1000/500/1000 | upgrade_unittypes.csv:1422 |
| 科技树 TIME / W/G/Oil/U | 100 / 1000/1000/1000/1000 | dbtechtreenode.csv:542 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DAMAGE (E14) | 2200 (=Tu16Kitai 2000×1.10) | upgrade_unittypes.csv:1422 |
| BUILDTIME (E14) | 110 (=Tu16Kitai 100×1.10) | upgrade_unittypes.csv:1422 |
| WOOD/GOLD/OIL/URANIUM (E14) | 1980/1980/1980/990 (=Tu16Kitai 1800/1800/1800/900×1.10) | upgrade_unittypes.csv:1422 |
| 科技树 TIME / W/G/Oil/U | 110 / 1980/1980/1980/1980 (=Tu16Kitai节点×1.10) | dbtechtreenode.csv:542 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — canberraJapanUpgradeEpoch14行(1422)
- `EE2X_db/TechTree/dbtechtreenode.csv` — canberraJapan节点行(542)
- 攻击块引用Tu16Kitai14Attack(damage=0不覆盖CSV)，无需新建DDF块

### 修改依据
- 需求: 日本E14轰炸机成本比中国高10%、伤害高10%
- 对标: Tu16Kitai (中国轰6K战神轰炸机)

### 已知影响
- 伤害+83%(1200→2200)成为E14最强轰炸机，但成本翻倍、BT从33暴涨至110
- HP保持3000（低于轰6K的7500，用户未要求调整）

### 备份
- pre: `backup\EE2X_db-173-日本E14空军对标中国-pre.zip`
- runtime: `backup\EE2X_db-174-日本E14空军修改后完整ZIP-runtime.zip`
