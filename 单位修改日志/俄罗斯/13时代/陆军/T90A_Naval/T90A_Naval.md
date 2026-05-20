# T90A_Naval 修改日志

> 目录: `俄罗斯-13时代-陆军-T90A_Naval\`

---

## 第1次修改 — 2026-05-19 16:00

**关联快照**: `进度快照\015-E13冷战步战与两栖单位差异化.md`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 4800 | Yuanhang_Tao_13zhuangjia_units.ddf:1885 |
| damage | 400 | Yuanhang_Tao_13zhuangjia_units.ddf:1906 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 4600 | Yuanhang_Tao_13zhuangjia_units.ddf:1885 |
| damage | 390 | Yuanhang_Tao_13zhuangjia_units.ddf:1906 |

### 关联文件
- `EE2X_db/Units/Yuanhang_Tao_13zhuangjia_units.ddf` — UnitType T90A_Naval (行1885, 1906)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行645, [upHelicopter_13]
- `EE2X_db/TechTree/upgrade_unittypes.csv` — T90A_NavalUpgradeEpoch13 (行907)

### 修改依据
- 需求: 方案文档《E13冷战步战与两栖单位调优方案》— 两栖坦克线差异化
- 理由: T90A_Naval与ZTQ15原值完全雷同(HP=4800/dmg=400)。T-72/T-90复合装甲时代较ZTQ15早30年，HP降至4600。125mm炮威力大但精度略逊于西方，dmg降至390
- 历史锚点: T-72B/T-90 — 125mm 2A46滑膛炮、复合装甲+ERA、深海涉水能力(5m snorkel)

### 已知影响
- 两栖三车: ZTQ15(HP4800/dmg400) > T90A_Naval(HP4600/dmg390) > American_M1A1(HP4300/dmg350)
- 梯度合理: 中国现代轻坦 > 俄冷战重坦 > 美冷战初期MBT
