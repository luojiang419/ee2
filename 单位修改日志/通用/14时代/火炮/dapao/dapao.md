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

---

## 第2次修改 — 2026-05-21 11:19

**关联快照**: `进度快照\044-E14火炮阵地炮弹改为火箭弹.md`
**修改类型**: 数值调整（弹种替换）

### 修改前数据 (2026-05-21 11:00)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| E14 missileName | DapaoShell (复用E13的dapaoEpoch13Attack) | dapao.ddf |
| E14 CSV引用 | [dapaoEpoch13Attack] | upgrade_unittypes.csv:669 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| E14 missileName | **MlrsRocket_PHL03** (与BM30龙卷风统一) | dapao.ddf — 新增 dapaoEpoch14Attack 块 |
| E14 turretControllerName | MRocketLauncherTurret | dapao.ddf |
| E14 areaDamageRadius | 3 | dapao.ddf |
| E14 throwUnits | true | dapao.ddf |
| E14 CSV引用 | [dapaoEpoch14Attack] | upgrade_unittypes.csv:669 |

### 关联文件
- `EE2X_db/Units/dapao.ddf` — 新增 dapaoEpoch14Attack 块（第80-89行）
- `EE2X_db/TechTree/upgrade_unittypes.csv` — 第669行引用修正
- `Empire Earth II/zips_ee2x/EE2X_db.zip` — 已打包

### 修改依据
- 需求: E14 火炮阵地炮弹类型修改为火箭弹，与俄罗斯龙卷风火箭炮(BM30)使用一样的弹药
- 理由: E14 模型(dapao_14.NIF)已是火箭炮外观(Muzzle_Phl032 + fx_battle_rocket_launch)，弹种却用DapaoShell，视觉与数据不匹配

### 已知影响
- E14 独立使用 dapaoEpoch14Attack，不再与 E13 共用，E13 不受影响
- E15 继续使用 dapaoEpoch15Attack（DapaoShell），不受影响
