# AH64Japan (日本AH64阿帕奇武装直升机) 修改日志

> 目录: `日本/14时代/空军/AH64Japan\`

---

## 第1次修改 — 2026-07-16 22:51

**关联快照**: `进度快照\131-日本E14空军对标中国.md`
**修改类型**: 数值调整（其他飞机/直升机：对标中国ChinaWZ10，成本×1.10、伤害×1.10）

### 修改前数据 (2026-07-16 22:44)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DAMAGE (E14) | 800 | upgrade_unittypes.csv:1657 |
| BUILDTIME (E14) | 65 | upgrade_unittypes.csv:1657 |
| FOOD/WOOD/OIL/URANIUM (E14) | 540/660/360/720 | upgrade_unittypes.csv:1657 |
| 科技树 TIME / W/G/Oil/U | 70 / 450/450/250/450 | dbtechtreenode.csv:551 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| DAMAGE (E14) | 682 (=ChinaWZ10 620×1.10) | upgrade_unittypes.csv:1657 |
| BUILDTIME (E14) | 61 (=ChinaWZ10 55×1.10四舍五入) | upgrade_unittypes.csv:1657 |
| FOOD/WOOD/OIL/URANIUM (E14) | 418/517/275/561 (=ChinaWZ10 380/470/250/510×1.10) | upgrade_unittypes.csv:1657 |
| 科技树 TIME / W/G/Oil/U | 77 / 495/495/275/495 (=ChinaWZ10节点×1.10) | dbtechtreenode.csv:551 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — AH64JapanUpgradeEpoch14行(1657)
- `EE2X_db/TechTree/dbtechtreenode.csv` — AH64Japan节点行(551)
- 攻击块引用LightMounted2Epoch13Attack(damage=0不覆盖CSV)，无需新建DDF块

### 修改依据
- 需求: 日本E14其他飞机成本比中国高10%、伤害高10%
- 对标: ChinaWZ10 (中国武直-10)

### 已知影响
- 伤害从800降至682（原值高于中国29%，按对标×1.10后反而下降）
- 成本整体下降（原值已高于中国×1.10基准）

### 备份
- pre: `backup\EE2X_db-173-日本E14空军对标中国-pre.zip`
- runtime: `backup\EE2X_db-174-日本E14空军修改后完整ZIP-runtime.zip`
