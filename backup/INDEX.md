# 备份索引

> 最后更新: 2026-05-21 23:00
> 格式 v3: 8 列（类型 + 运行状态），备份文件名使用中文描述

---

## EE2X_db 游戏数据备份

| 序号 | 备份包 | 类型 | 修改目标 | 包含文件 | 修改描述 | 运行状态 | 时间 |
|:-----|:------|:-----|:--------|:--------|:--------|:--------|:-----|
| 001 | EE2X_db-001-中美俄14时代调优基线-pre.zip | pre | 14时代海军全单位 | upgrade_unittypes.csv, 多个DDF | 中美俄14时代海陆空单位调优方案启动前基线 | — | 2026-05-18 |
| 002 | EE2X_db-002-阶段二海军差异化-pre.zip | pre | 14时代海军差异化 | upgrade_unittypes.csv | 阶段一AA防空护卫舰改造完成后，阶段二海军差异化启动前 | — | 2026-05-18 |
| 003 | EE2X_db-003-陆军坦克五类分级-pre.zip | pre | 14时代陆军坦克差异化 | upgrade_unittypes.csv | 陆军坦克五类分级与国家特色修改启动前 | — | 2026-05-19 |
| 004 | EE2X_db-004-E11时代全局调优-pre.zip | pre | E11时代全局调优 | upgrade_unittypes.csv, 多DDF | E11时代全面调优（海陆空+建筑）启动前 | — | 2026-05-19 |
| 005 | EE2X_db-005-E14空军差异化-pre.zip | pre | E14空军调优 | upgrade_unittypes.csv, 空军DDF | E14空军（战斗/轰炸/直升机）差异化重平衡启动前 | — | 2026-05-19 |
| 006 | EE2X_db-006-护卫舰防空弹药-pre.zip | pre | 护卫舰防空弹药 | frigate相关DDF | 三舰全线AA改造：护卫舰新增防空弹药/对空能力 | — | 2026-05-20 |
| 007 | EE2X_db-007-火炮阵地E14去对空-pre.zip | pre | dapao(火炮阵地) E14 | upgrade_unittypes.csv, dapao.ddf | E14火炮阵地移除对空攻击、调整射程14/攻击400 | — | 2026-05-20 |
| 008 | EE2X_db-008-超级主力舰三倍属性v2-pre.zip | pre | 超级主力舰三倍属性 | upgrade_unittypes.csv, 主力舰DDF | 超级主力舰HP/伤害/射程三倍化v2启动前 | — | 2026-05-20 |
| 013 | EE2X_db-013-提炼厂化工厂进驻人口-pre.zip | pre | Oilref/Chemistry 进驻人口 | Yuanhang_720_units.ddf | 提炼厂/化工厂numOfSlots从6改为25 | — | 2026-05-20 |
| 014 | EE2X_db-014-E14战斗机三国重平衡-pre.zip | pre | E14战斗机三国重平衡 | upgrade_unittypes.csv, fighter相关DDF | 中美俄E14战斗机HP/伤害/速度差异化 | — | 2026-05-20 |
| 016 | EE2X_db-016-萨姆防空攻击力递增-pre.zip | pre | 萨姆防空导弹攻击力 | upgrade_unittypes.csv, SAM相关DDF | 萨姆防空导弹攻击力按时代递增调整 | — | 2026-05-20 |
| 017 | EE2X_db-017-萨姆三轮齐射-pre.zip | pre | 萨姆三轮齐射 | upgrade_unittypes.csv, SAM相关DDF | 萨姆导弹从单发改三轮齐射改造 | — | 2026-05-20 |
| 022 | EE2X_db-022-机枪碉堡步兵克制-pre.zip | pre | Machinegunnest(机枪碉堡) E11-E15 | dbcombat_unittypeadjust.csv | 对轻步兵/重步兵/特种部队全线130%(1.3x)克制 | — | 2026-05-21 |
| 023 | EE2X_db-023-领袖级E14属性调整-pre.zip | pre | Cruiser1164(俄罗斯领袖级) E14 | upgrade_unittypes.csv | HP50000/攻3300/射43/视野43/装填2s/建造130s | — | 2026-05-21 |
| 024 | EE2X_db-024-汽车工厂集结点-pre.zip | pre | Autofactory(汽车工厂) | Yuanhang_720_units.ddf | 添加RallyPlacementFlags启用集结点功能 | — | 2026-05-21 |
| 028 | EE2X_db-028-E14空军去粮食-pre.zip | pre | E14空军移除粮食消耗 | upgrade_unittypes.csv | f16/mig29k/ChinaWZ10/AH64 E14 FOOD归零 | — | 2026-05-21 |
| 029 | EE2X_db-029-超级主力舰三倍化射速翻倍-pre.zip | pre | 超级主力舰E14(Ch055A/DDG1001/Cruiser1164) + AA护卫舰还原 | upgrade_unittypes.csv, dbtechtreenode.csv | 超级主力舰×3三倍化+装填减半+成本统一3000; AA护卫舰还原为800/600/20; TechPts 10→50 | — | 2026-05-21 |
| 030 | EE2X_db-029-超级主力舰修改后完整游戏ZIP-runtime.zip | runtime | 超级主力舰E14修改后完整游戏ZIP | EE2X_db.zip 完整 | 快照023+037+040合并: 超级主力舰三倍化+护卫舰还原+射速翻倍+成本统一 | 测试通过 | 2026-05-21 |
| 031 | EE2X_db-030-E14战斗机三国差异化重平衡-pre.zip | pre | E14制空+多用途战斗机6单位 | upgrade_unittypes.csv | J10B(1500/600/300)+f16(1600/700/330)+mig29k(1500/570/280)+JH7A(2500/1000/450)+A10(2900/1200/500)+su25(2500/850/400) | — | 2026-05-21 |
| 032 | EE2X_db-030-E14战斗机三国差异化重平衡-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 031修改应用后的完整游戏ZIP | 测试通过 | 2026-05-21 |
| 033 | EE2X_db-031-E14战斗机去粮食-pre.zip | pre | E14战斗机6单位Food归零 | upgrade_unittypes.csv | J10B/JH7A/f16/A10/mig29k/su25 E14 Food→0 | — | 2026-05-21 |
| 034 | EE2X_db-031-E14战斗机去粮食-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 033修改应用后的完整游戏ZIP | 测试通过 | 2026-05-21 |
| 035 | EE2X_db-032-E14高级战斗机型差异化-pre.zip | pre | E14高级战斗机J11A/f14/su27差异化 | upgrade_unittypes.csv | J11A(1950/780/1.15/450)+f14(2080/910/0.81/495)+su27(1950/741/0.69/420) | — | 2026-05-22 |
| 036 | EE2X_db-032-E14高级战斗机型差异化-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 035修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 037 | EE2X_db-033-E14高级战斗机HP加30ATK加20-pre.zip | pre | E14高级战斗机J11A/f14/su27 HP+30% ATK+20% | upgrade_unittypes.csv | J11A(2535/936)+f14(2704/1092)+su27(2535/889) | — | 2026-05-22 |
| 038 | EE2X_db-033-E14高级战斗机HP加30ATK加20-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 037修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 039 | EE2X_db-034-E14高级战斗机成本加40-pre.zip | pre | E14高级战斗机J11A/f14/su27成本+40% | upgrade_unittypes.csv | J11A(630)+f14(693)+su27(588) 5资源各 | — | 2026-05-22 |
| 040 | EE2X_db-034-E14高级战斗机成本加40-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 039修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 041 | EE2X_db-035-E14高级战斗机射程加25-pre.zip | pre | E14高级战斗机J11A/f14/su27射程+25% | upgrade_unittypes.csv | J11A(19)+f14(23)+su27(21) | — | 2026-05-22 |
| 042 | EE2X_db-035-E14高级战斗机射程加25-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 041修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 043 | EE2X_db-036-E14高级战斗机手动调参-pre.zip | pre | E14高级战斗机手动调参 | upgrade_unittypes.csv | J11A(2300/1100/23)+f14(2500/1000/22)+su27(2700/1000/21) | — | 2026-05-22 |
| 044 | EE2X_db-036-E14高级战斗机手动调参-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 043修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 045 | EE2X_db-037-E14工程机械采集速率10倍化-pre.zip | pre | Harvester/Weelloader/Tractor 采集速率 | Yuanhang_720_units.ddf | 3单位12行: carryLimit×10 + 各资源rate×10 | — | 2026-05-22 |
| 046 | EE2X_db-037-E14工程机械采集速率10倍化-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 045修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 047 | EE2X_db-038-汽车工厂集结点-pre.zip | pre | Autofactory添加RallyPlacementFlags | Yuanhang_720_units.ddf | 新增1行: RallyPlacementFlags = (Resources\|Fortress\|Tower\|Terrain) | — | 2026-05-22 |
| 048 | EE2X_db-038-汽车工厂集结点-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 047修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 049 | EE2X_db-039-Barracks潜艇医院-pre.zip | pre | Barracks(HP+50%/成本-60%)+潜艇(高伤低HP)+医院→大学 | upgrade_unittypes.csv, dbtechtreenode.csv | 11行: Barracks E1-E15×6 + 潜艇×3 + Medcar/SisterMona→University | — | 2026-05-22 |
| 050 | EE2X_db-039-Barracks潜艇医院-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 049修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 051 | EE2X_db-040-E14兵营步兵HP加50成本减60-pre.zip | pre | E14兵营步兵9单位 HP+50%成本-60% | upgrade_unittypes.csv, Yuanhang_720_units.ddf | LightInfantry/HeavyInfantry1/HeavyInfantry2/Sniper/M3AT37mm(CSV)+ChinaArmy/usaSoldiers/RusSoldiers/ATSoldiers(DDF HP) | — | 2026-05-22 |
| 052 | EE2X_db-040-E14兵营步兵HP加50成本减60-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 051修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |

## 更新器/启动器备份

| 序号 | 备份包 | 类型 | 修改目标 | 包含文件 | 修改描述 | 运行状态 | 时间 |
|:-----|:------|:-----|:--------|:--------|:--------|:--------|:-----|
| 008 | EE2X_db-008-更新器重构一期-pre.zip | pre | 更新器重构一期 | 更新器源码+配置 | 更新器重构（main.js/updater_core.py/updater_gui）启动前 | — | 2026-05-20 |
| 009 | EE2X_db-009-更新器Windows打包-pre.zip | pre | 更新器Windows打包 | 更新器+build脚本 | PyInstaller打包+启动器替换验证前 | — | 2026-05-20 |
| 011 | EE2X_db-011-Flutter版本历史-pre.zip | pre | Flutter版本历史 | flutter_publish_tool | Flutter发布端版本历史功能开发前 | — | 2026-05-20 |
| 020 | EE2X_db-020-启动器更新卡死修复-pre.zip | pre | 启动器更新卡死修复 | main.js/preload.js/updater_core.py | 启动器自升级熔断+诊断文件+空包止血 | — | 2026-05-21 |
| 021 | EE2X_db-021-版本发布前源码快照-pre.zip | pre | 1.0.0基线快照 | 项目源码+配置 | 1.0.0版本发布前完整源码快照（不含游戏本体） | — | 2026-05-21 |
| 025 | EE2X_db-025-E14步兵HP加40成本减20-pre.zip | pre | E14全部9个步兵单位 | upgrade_unittypes.csv, Yuanhang_720_units.ddf, dbtechtreenode.csv | E14步兵全员HP+40%/成本-20%（3通用+1狙击+5特种） | — | 2026-05-21 |
| 026 | EE2X_db-026-E14步兵反坦克迫击炮狙击手-pre.zip | pre | ATSoldiers/HeavyInfantry2/Sniper/CsCommgril | upgrade_unittypes.csv, Yuanhang_720_units.ddf, dbtechtreenode.csv | 反坦克兵去石头/迫击炮射程20/狙击手视野18/女特种兵速度15 | — | 2026-05-21 |
| 027 | EE2X_db-027-Mill工厂4类单位差异化-pre.zip | pre | Mill工厂4类单位(SPG/MLRS/AA短程/AA远程)中美俄E14 | upgrade_unittypes.csv, dbtechtreenode.csv, *lujun.ddf×3, Yuanhang_*.ddf×3 | 射程/伤害/装填/速度/部署/成本百分比差异化调整 | — | 2026-05-21 |

## 旧格式全量快照（历史遗留）

| 备份包 | 大小 | 内容 | 说明 |
|:------|:-----|:-----|:-----|
| EE2X_db_original_20260518-1943.zip | 1.6 MB | 全部548个DB文件 | 项目初始原始数据库全量，仅作历史参考 |
| EE2X_db_backup_20260521_111948.zip | 1.7 MB | 全部506个DB文件 | dapao E14火箭弹修改前全量，已由精准备份覆盖 |

---

> **规则**: 新备份**只打包本次修改的文件**（通常2-3个），不打包全库。文件名使用中文简要描述。旧的全量快照已有精准备份覆盖，可视为冗余。
