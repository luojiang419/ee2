# Spy 修改日志

> 目录: `通用-陆军-Spy\`

---

## 第1次修改 — 2026-07-25

**关联快照**: `进度快照\132-J20光环转移间谍.md`
**修改类型**: 数值调整

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| abilities | Move, LOS, SpecialPower(Extraction+GatherIntelligence), Garrisonable | spy.ddf:19-31 |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| abilities | Move, LOS, AreaEffect(AIResourcePower), SpecialPower(Extraction+GatherIntelligence), Garrisonable | spy.ddf:19-37 |

### 关联文件
- `EE2X_db/Units/spy.ddf` — Spy UnitType abilities块(19-37行)
- `EE2X_db/Units/Chinese_army.ddf` — J20 UnitType AreaEffect块(AIResourcePower移除)

### 修改依据
- 需求: 将J20的AIResourcePower采集加成光环转移到Spy间谍单位
- 理由: 间谍作为特殊单位，携带采集光环更符合角色定位

### 已知影响
- Spy获得AIResourcePower光环: 半径500内市民全资源(Food/Wood/Stone/Gold/Saltpeter)采集速率×3
- 提炼厂/化工厂/盐矿/水泥厂等所有资源上交点效率×3
- J20失去采集加成，保留SuperVision侦查
