# 进度快照 135 — 伐木场光环 RadiusFromUnit 修复

> 日期: 2026-08-15
> 关联备份: #182 (pre) / #183 (runtime, 待测试)
> 关联日志: `单位修改日志\通用\4时代\建筑\Lumber\Lumber.md` 第2次修改

---

## 已完成内容

### 1. 异常诊断（#181 用户反馈"领土内外均无加成"）
- **元凶锁定**: `range = Global` —— 采集类 effect（EffectResourceGatherRate）无 Global 先例，引擎不触发导致整个光环失效
- **IsWonder 排除嫌疑**: 90+ 个奇迹建筑（bigben/stonehenge/HeavenTemple 等）均 IsWonder+AreaEffect 并存，证明奇迹属性不抑制光环
- **正确先例**: AIResourcePower（dbareaeffects_unittype.ddf:300）—— 采集光环正宗组合为 `RadiusFromUnit + radius=500 + mask=Citizens`

### 2. 修复内容
| 文件 | 修改 |
|:-----|:-----|
| `EE2X_db/AreaEffects/dbareaeffects_unittype.ddf` | LumberBonus 两处 range: Global → **RadiusFromUnit**，各插入 **radius = 10000**（≈全图，实现任意领土生效） |
| `EE2X_db/Units/Yuanhang_720_units.ddf` | IsWonder 保留不变 |

- ⚠️ 过程中踩坑：首次修复误用赋值覆盖了 `mask = Citizens` 行 → 已从 pre #182 恢复重做，diff 确认恰好 4 行改动、mask 保留
- pre 备份 #182 → diff 验证 → ZIP 打包（前缀正确）→ ZIP 内逐行验证通过 → runtime #183
- backup/INDEX.md 更新：#181 标记异常、#182/#183 追加

---

## 待办清单

- [ ] 🔴 用户启动游戏测试（见下方测试要点）
- [ ] 根据测试结果更新 INDEX.md #183 运行状态
- [ ] 快照 #133 遗留：UP1.6.2.005 测试反馈、511个待确认残留文件处置、间谍光环#178r测试
- [ ] （可选）重新生成总索引文档同步新行号

---

## 测试要点（用户执行）

1. **领土内生效**：造伐木场后市民在己方领土采集木材应 +50%
2. **任意领土生效**：市民在己方领土**之外**采集木材同样 +50%（radius=10000 覆盖全图）
3. **防叠加**：尝试建造第 2 个伐木场应被阻止（IsWonder 保留）
4. **超大地图**：若有超大图，确认地图远端角落也有加成（radius 10000 为推测值，先例为 500）

## 回退方案

- 若 #183 仍无加成：问题可能在 IsWonder 与 Lumber 的互动（非先例推断所能排除）→ 移除 IsWonder 单独测
- 若加成生效但范围不足：加大 radius
- 游戏 ZIP 直接恢复：`backup/EE2X_db-183-...-runtime.zip` 覆盖（当前状态）或 #177r（最近测试通过）

---

## 下一步

等用户测试反馈 → 更新 #183 运行状态 → 决定是否继续调优
