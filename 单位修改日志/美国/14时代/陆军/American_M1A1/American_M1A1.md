# American_M1A1 修改日志

> 目录: `美国-14时代-陆军-American_M1A1\`

---

## 第1次修改 — 2026-05-19 16:00

**关联快照**: `进度快照\015-E13冷战步战与两栖单位差异化.md`
**修改类型**: 数值调整(E13两栖坦克线CSV)

### 修改前数据 (CSV E13行)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 4000 | upgrade_unittypes.csv:880 |
| damage | 320 | upgrade_unittypes.csv:880 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HitPoints | 4300 | upgrade_unittypes.csv:880 |
| damage | 350 | upgrade_unittypes.csv:880 |

### 关联文件
- `EE2X_db/TechTree/upgrade_unittypes.csv` — USAM1A1UpgradeEpoch13 (行880)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行646, [upHelicopter_13]
- `EE2X_db/Units/American_army_lujun.ddf` — American_M1A2的E13模型

### 修改依据
- 需求: 方案文档《E13冷战步战与两栖单位调优方案》— 两栖坦克线
- 理由: American_M1A1 E13原HP=4000/dmg=320远低于ZTQ15(4800/400)和T90A_Naval(4800/400)。M48 Patton(1953)虽老但铸钢结构厚实，HP提升至4300接近两栖线基准。90mm M41炮dmg提升至350
- 历史锚点: M48 Patton — 90mm炮、铸钢装甲100-120mm、48吨、1953年服役

### 已知影响
- 两栖三车: ZTQ15(HP4800/dmg400) > T90A_Naval(HP4600/dmg390) > American_M1A1(HP4300/dmg350)
- American_M1A1速度最慢(1.4)但装甲最厚(铸钢)
