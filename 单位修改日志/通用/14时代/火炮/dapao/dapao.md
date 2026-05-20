# dapao (火炮阵地) 修改日志

> 目录: `通用/14时代/火炮/dapao/`

---

## 第1次修改 — 2026-05-20 09:55

**关联快照**: `进度快照\020-E14火炮阵地移除对空修改属性.md`
**修改类型**: 数值调整

### 背景
E14时代火炮阵地此前没有独立的升级数据行（CSV跳过E14，epoch14_upgrades.ddf无引用），实际继承E13属性（RANGE=17, DAMAGE=400, 有对空能力）。

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| 射程 (RANGE) | 17 | 继承E13: upgrade_unittypes.csv:668 |
| 攻击力 (DAMAGE) | 400 | 继承E13: upgrade_unittypes.csv:668 |
| 对空能力 | [AirDefense_select] | 继承E13: upgrade_unittypes.csv:668 |
| E14独立行 | 不存在 | — |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| 射程 (RANGE) | 14 | upgrade_unittypes.csv (新增行669) |
| 攻击力 (DAMAGE) | 400 | upgrade_unittypes.csv (新增行669) |
| 对空能力 | [] (已移除) | upgrade_unittypes.csv (新增行669) |
| HP | 8000 | upgrade_unittypes.csv (新增行669, 保持与E13一致) |
| LOS | 14 | upgrade_unittypes.csv (新增行669) |
| UPGRADEREFS | [dapaoEpoch13Attack] | 复用E13攻击块 |
| VISUAL | dapao_14 | upgrade_unittypes.csv (新增行669) |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — 新增行669: dapaoUpgradeEpoch14
- `EE2X_db/TechTree/epoch14_upgrades.ddf` — MainEpoch14中新增 dapaoUpgradeEpoch14 引用
- `EE2X_db/Units/dapao.ddf` — 未修改 (复用 dapaoEpoch13Attack)

### 修改依据
- 需求: 移除14时代火炮阵地的对空攻击能力，射程改为14，攻击力改为400
- 理由: 火炮阵地定位为纯对地远程打击建筑，不应对空；射程14与攻击400匹配中远程火力定位

### 已知影响
- E13及之前时代的火炮阵地不受影响（保留原有对空能力）
- E15时代火炮阵地不受影响
- epoch14_upgrades.ddf 中其他条目仅行号偏移1行，内容不变
