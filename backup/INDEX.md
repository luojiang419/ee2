# 备份索引

> 最后更新: 2026-05-21 18:02
> 格式 v2: 6 列详细描述（修改目标 + 包含文件 + 修改描述缺一不可）
> 新备份只打包本次修改涉及的文件，禁止全库快照。

---

## EE2X_db 游戏数据备份

| 序号 | 备份包 | 修改目标 | 包含文件 | 修改描述 | 时间 |
|:-----|:------|:--------|:--------|:--------|:-----|
| 001 | EE2X_db-001-stage1-pre.zip | 14时代海军全单位 | upgrade_unittypes.csv, 多个DDF | 中美俄14时代海陆空单位调优方案启动前基线 | 2026-05-18 |
| 002 | EE2X_db-002-phase2-pre.zip | 14时代海军差异化 | upgrade_unittypes.csv | 阶段一AA防空护卫舰改造完成后，阶段二海军差异化启动前 | 2026-05-18 |
| 003 | EE2X_db-003-army-diff-pre.zip | 14时代陆军坦克差异化 | upgrade_unittypes.csv | 陆军坦克五类分级与国家特色修改启动前 | 2026-05-19 |
| 004 | EE2X_db-004-E11-all-pre.zip | E11时代全局调优 | upgrade_unittypes.csv, 多DDF | E11时代全面调优（海陆空+建筑）启动前 | 2026-05-19 |
| 005 | EE2X_db-005-E14-air-pre.zip | E14空军调优 | upgrade_unittypes.csv, 空军DDF | E14空军（战斗/轰炸/直升机）差异化重平衡启动前 | 2026-05-19 |
| 006 | EE2X_db-006-frigate-AAM-pre.zip | 护卫舰防空弹药 | frigate相关DDF | 三舰全线AA改造：护卫舰新增防空弹药/对空能力 | 2026-05-20 |
| 007 | EE2X_db-007-dapao14-pre.zip | dapao(火炮阵地) E14 | upgrade_unittypes.csv, dapao.ddf | E14火炮阵地移除对空攻击、调整射程14/攻击400 | 2026-05-20 |
| 008 | EE2X_db-008-super-battleship-pre.zip | 超级主力舰三倍属性 | upgrade_unittypes.csv, 主力舰DDF | 超级主力舰HP/伤害/射程三倍化v2启动前 | 2026-05-20 |
| 013 | EE2X_db-013-refinery-chem-garrison-pre.zip | Oilref/Chemistry 进驻人口 | Yuanhang_720_units.ddf | 提炼厂/化工厂numOfSlots从6改为25 | 2026-05-20 |
| 014 | EE2X_db-014-e14-fighter-rebalance-pre.zip | E14战斗机三国重平衡 | upgrade_unittypes.csv, fighter相关DDF | 中美俄E14战斗机HP/伤害/速度差异化 | 2026-05-20 |
| 016 | EE2X_db-016-sam-attack-progression-pre.zip | 萨姆防空导弹攻击力 | upgrade_unittypes.csv, SAM相关DDF | 萨姆防空导弹攻击力按时代递增调整 | 2026-05-20 |
| 017 | EE2X_db-017-sam-salvo-3missile-pre.zip | 萨姆三轮齐射 | upgrade_unittypes.csv, SAM相关DDF | 萨姆导弹从单发改三轮齐射改造 | 2026-05-20 |
| 028 | EE2X_db-028-e14-air-remove-food-pre.zip | E14空军移除粮食消耗 | upgrade_unittypes.csv | f16/mig29k/ChinaWZ10/AH64的E14 FOOD归零(330/280/450/450→0) | 2026-05-21 |

## 更新器/启动器备份

| 序号 | 备份包 | 修改目标 | 包含文件 | 修改描述 | 时间 |
|:-----|:------|:--------|:--------|:--------|:-----|
| 008 | EE2X_db-008-updater-redesign-pre.zip | 更新器重构一期 | 更新器源码+配置 | 更新器重构（main.js/updater_core.py/updater_gui）启动前 | 2026-05-20 |
| 009 | EE2X_db-009-updater-packaging-pre.zip | 更新器Windows打包 | 更新器+build脚本 | PyInstaller打包+启动器替换验证前 | 2026-05-20 |
| 011 | EE2X_db-011-flutter-history-pre.zip | Flutter版本历史 | flutter_publish_tool | Flutter发布端版本历史功能开发前 | 2026-05-20 |
| 020 | EE2X_db-020-launcher-update-fix-pre.zip | 启动器更新卡死修复 | main.js/preload.js/updater_core.py | 启动器自升级熔断+诊断文件+空包止血 | 2026-05-21 |
| 021 | EE2X_db-021-baseline-1.0.0-pre-quick.zip | 1.0.0基线快照 | 项目源码+配置 | 1.0.0版本发布前完整源码快照（不含游戏本体） | 2026-05-21 |
| 025 | EE2X_db-025-infantry-e14-hp1.4x-cost0.8x-pre.zip | E14全部9个步兵单位 | upgrade_unittypes.csv, Yuanhang_720_units.ddf, dbtechtreenode.csv | E14步兵全员HP+40%/成本-20%（3通用+1狙击+5特种） | 2026-05-21 16:52 |
| 026 | EE2X_db-026-infantry-e14-at-stone-mortar-range-sniper-cs-speed-pre.zip | ATSoldiers/HeavyInfantry2/Sniper/CsCommgril | upgrade_unittypes.csv, Yuanhang_720_units.ddf, dbtechtreenode.csv | 反坦克兵去石头/迫击炮射程20/狙击手视野18/女特种兵速度15 | 2026-05-21 16:58 |
| 027 | EE2X_db-027-mill-artillery-aa-mlrs-rebalance-pre.zip | Mill工厂4类单位(SPG/MLRS/AA短程/AA远程)中美俄E14 | upgrade_unittypes.csv, dbtechtreenode.csv, *lujun.ddf×3, Yuanhang_*.ddf×3 | 射程/伤害/装填/速度/部署/成本百分比差异化调整 | 2026-05-21 18:02 |
| 022 | EE2X_db-022-machinegunnest-infantry-1.3x-pre.zip | Machinegunnest(机枪碉堡) E11-E15 | dbcombat_unittypeadjust.csv | 对轻步兵/重步兵/特种部队全线130%(1.3x)克制 | 2026-05-21 12:00 |
| 023 | EE2X_db-023-Cruiser1164-e14-attr-adjust-pre.zip | Cruiser1164(俄罗斯领袖级) E14 | upgrade_unittypes.csv | HP50000/攻3300/射43/视野43/装填2s/建造130s;金2500/铁2800/油2500/铀2800 | 2026-05-21 14:30 |
| 024 | EE2X_db-024-autofactory-rallypoint-pre.zip | Autofactory(汽车工厂) | Yuanhang_720_units.ddf | 添加RallyPlacementFlags启用集结点功能 | 2026-05-21 15:30 |

## 旧格式全量快照（历史遗留，不符合新规则）

| 备份包 | 大小 | 内容 | 说明 |
|:------|:-----|:-----|:-----|
| EE2X_db_original_20260518-1943.zip | 1.6 MB | 全部548个DB文件 | 项目初始原始数据库全量，仅作历史参考 |
| EE2X_db_backup_20260521_111948.zip | 1.7 MB | 全部506个DB文件 | dapao E14火箭弹修改前全量，已由007+022两个精准备份覆盖 |

---

> **规则**: 新备份**只打包本次修改的文件**（通常2-3个），不打包全库。旧的全量快照已有精准备份覆盖，可视为冗余。
