# ZTQ15 修改日志

> 目录: `中国-13时代-陆军-ZTQ15\`

---

## 第1次修改 — 2026-05-19 16:00

**关联快照**: `进度快照\015-E13冷战步战与两栖单位差异化.md`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| speed | 1.7 | Yuanhang_Tao_13zhuangjia_units.ddf:1792 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| speed | 1.8 | Yuanhang_Tao_13zhuangjia_units.ddf:1792 |

### 关联文件
- `EE2X_db/Units/Yuanhang_Tao_13zhuangjia_units.ddf` — UnitType ZTQ15 (行1792)
- `EE2X_db/TechTree/dbtechtreenode.csv` — 行577, [upHelicopter_13]
- `EE2X_db/TechTree/upgrade_unittypes.csv` — ZTQ15UpgradeEpoch13 (行865)

### 修改依据
- 需求: 方案文档《E13冷战步战与两栖单位调优方案》— 两栖坦克线差异化
- 理由: ZTQ15仅33-36吨(轻坦级)，功重比优秀。speed 1.7→1.8体现轻坦灵活性，与T90A_Naval(spd=1.8)持平，远超American_M1A1 E13(spd=1.4)
- 历史锚点: Type 15轻坦 — 105mm炮、33吨、液气悬挂、高原/两栖专用

### 已知影响
- 两栖三车速度梯度: ZTQ15(1.8)=T90A_Naval(1.8) >> American_M1A1(1.4)
- ZTQ15定位: E13最灵活的轻量两栖坦克
