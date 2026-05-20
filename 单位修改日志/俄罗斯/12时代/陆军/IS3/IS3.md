# IS3 修改日志

> 目录: `俄罗斯-12时代-陆军-IS3\`

---

## 第1次修改 — 2026-05-19 11:04

**关联快照**: `进度快照\013-E12二战坦克差异化完成.md`
**修改类型**: 数值调整

### 修改前数据 (2026-05-19 11:04)
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| speed | 1.7 | Yuanhang_720_units.ddf:7430 |
| angSpeed | 40 | Yuanhang_720_units.ddf:7430 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| speed | 1.45 | Yuanhang_720_units.ddf:7430 |
| angSpeed | 45 | Yuanhang_720_units.ddf:7430 |

### 关联文件
- `EE2X_db/Units/Yuanhang_720_units.ddf` — UnitType IS3 (行7430)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行776, [upLightTnak_12]

### 修改依据
- 需求: 方案文档《坦克五类分级与国家特色》— IS3分类为Heavy tank，俄罗斯顶级重坦，最低速/最笨重/最高耐久
- 理由: 原speed=1.7完全不符合重坦定位。IS3作为E12俄系重坦顶点应最慢但最耐打

### 已知影响
- IS3速度全E12坦克最低(speed=1.45)，转弯也最慢(angSpeed=45)
- HP=3700保持不变(E12最高)，pop=4占用
- 速度梯度完整：MBT(KV1=1.6) → 重坦中(KV2/IS2=1.5) → 重坦顶(IS3=1.45)
