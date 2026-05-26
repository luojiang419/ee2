# 备份索引

> 最后更新: 2026-05-26 三舰防空统一E14
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
| 053 | EE2X_db-041-三舰HP50成本20-pre.zip | pre | Ch055/Ticonderoga/Kirov三舰全时代+汽车厂6单位+挖掘机油铀 | upgrade_unittypes.csv, Yuanhang_720_units.ddf | 15行CSV: 三舰E11-E15 HP×1.5成本×1.2; 8行DDF: 6单位mass→0 + Weelloader oilRate/uraniumRate 5.0 | — | 2026-05-22 |
| 054 | EE2X_db-041-三舰HP50成本20-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 053修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 055 | EE2X_db-042-E14火炮阵地火箭弹-pre.zip | pre | E14火炮阵地炮弹改为MlrsRocket_PHL03 | dapao.ddf, upgrade_unittypes.csv | DDF新增dapaoEpoch14Attack块+CSV引用修正 | — | 2026-05-22 |
| 056 | EE2X_db-042-E14火炮阵地火箭弹-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 055修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 057 | EE2X_db-043-三舰射速减半Cruiser1164增强-pre.zip | pre | Ch055A/DDG1001/Cruiser1164 E14三舰 | upgrade_unittypes.csv | 三舰RELOAD统一×2(Ch055A/DDG1001 1.0→2.0; Cruiser1164 1.15→2.3); Cruiser1164 HP 37500→52000 DAMAGE 2850→3300 RANGE 46→43 | — | 2026-05-22 |
| 058 | EE2X_db-043-三舰射速减半Cruiser1164增强-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 057修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 |
| 059 | EE2X_db-044-E14防空三梯次改造-pre.zip | pre | E14陆军防空9单位三梯次改造 | upgrade_unittypes.csv, light_artillery2.ddf, Chinese_army_lujun.ddf, American_army_lujun.ddf, Russian_army_lujun.ddf, Yuanhang_Tao_13zhuangjia_units.ddf | 近程(R15/Rel0.3/Dmg500): LightArtillery2; 中程(R25/Rel1.0/Dmg1000): HQ61+PAC3+BUKM1_2+ZiYuan; 远程(R35/Rel1.5/Dmg1500): Thaad+HQ9+Am_THAAD+Ru_S400 | — | 2026-05-22 17:52 |
| 060 | EE2X_db-044-E14防空三梯次改造-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 059修改应用后的完整游戏ZIP | 测试通过 | 2026-05-22 17:52 |
| 061 | EE2X_db-045-汽车工厂集结点修复-pre.zip | pre | Autofactory 集结点 | EE2X_db.zip 完整 | 游戏ZIP修复前的当前状态（缺失RallyPlacementFlags） | — | 2026-05-24 20:30 |
| 062 | EE2X_db-045-汽车工厂集结点修复-runtime.zip | runtime | Autofactory 集结点 | EE2X_db.zip 完整 | 重新打包ZIP恢复RallyPlacementFlags=(Resources\|Fortress\|Tower\|Terrain) | 测试通过 | 2026-05-24 20:30 |
| 063 | EE2X_db-046-sync-other-dev-pre.zip | pre | 同步其他开发者最新参数(19文件) | dbcombat_unittypeadjust.csv, dbtechtreenode.csv, epoch14_upgrades.ddf, upgrade_unittypes.csv, aaship/Chinese_army_lujun/dapao/fortress/light_artillery2/mill/radar/Russian_army/American_army_lujun/Chinese_army/Russian_army_lujun/Yuanhang_720_units/Yuanhang_Tao_13naval_units/Yuanhang_Tao_13zhuangjia_units/Yuanhang_Tao_740_units.ddf | 以其他开发者最新版本为准，覆盖RPS克制/科技树/E14升级集/升级表/15个DDF | — | 2026-05-24 |
| 064 | EE2X_db-046-sync-other-dev-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 063同步修改后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 065 | EE2X_db-047-autofactory-rallypoint-pre.zip | pre | Autofactory(Yuanhang_720_units.ddf) | Yuanhang_720_units.ddf | 同步后恢复丢失的RallyPlacementFlags=(Resources\|Fortress\|Tower\|Terrain) | — | 2026-05-24 |
| 066 | EE2X_db-047-autofactory-rallypoint-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 065修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 067 | EE2X_db-049-Ch055A-E15属性上调20%-pre.zip | pre | Ch055A(中国海军055A) E15 | upgrade_unittypes.csv | E15全部属性×1.2(按E14基准): HP50400/LOS86/DAMAGE3600/RANGE58/RELOAD2.4; 造价×1.3: BUILD468/食3900/木5850/金5850/油5850/铀5850 | — | 2026-05-24 |
| 068 | EE2X_db-049-Ch055A-E15属性上调20%-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 067修改应用后的完整游戏ZIP | 待测试 | 2026-05-24 |
| 069 | EE2X_db-050-Ch055A-E11E13属性平滑递增-pre.zip | pre | Ch055A(中国海军055A) E11-E13 | upgrade_unittypes.csv | E11-E13按E14基准逐代-20%属性/-30%成本平滑递增: E11(24306/42/1736/28/1.2s/164/1365/2048/2048/2048/2048) E12(29167/50/2083/33/1.4s/213/1775/2663/2663/2663/2663) E13(35000/60/2500/40/1.7s/277/2308/3462/3462/3462/3462) | — | 2026-05-24 |
| 070 | EE2X_db-050-Ch055A-E11E13属性平滑递增-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 069修改应用后的完整游戏ZIP | 待测试 | 2026-05-24 |
| 071 | EE2X_db-051-Ch055A射程调整为Ch055加20%-pre.zip | pre | Ch055A(中国海军055A) E11-E15全时代 | upgrade_unittypes.csv | 射程调整为Ch055驱逐舰+20%: E11(28→22)/E12(33→24)/E13(40→26)/E14(48→29)/E15(58→31) | — | 2026-05-24 |
| 072 | EE2X_db-051-Ch055A射程调整为Ch055加20%-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 071修改应用后的完整游戏ZIP | 待测试 | 2026-05-24 |
| 073 | EE2X_db-052-Ch055A以Ch055为基准重平衡-pre.zip | pre | Ch055A(中国海军055A) E11-E15全时代 | upgrade_unittypes.csv | 以Ch055为基准全面重平衡: HP×2.0/DAMAGE×1.3/RELOAD同步Ch055/LOS×1.5/造价×3.5, 实现2.5艘Ch055兑1艘Ch055A(损2艘+半血) | — | 2026-05-24 |
| 074 | EE2X_db-052-Ch055A以Ch055为基准重平衡-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 073修改应用后的完整游戏ZIP | 待测试 | 2026-05-24 |
| 075 | EE2X_db-053-Ch055A-DDF升级能力同步CSV-pre.zip | pre | Ch055A DDF UpgradeAbilities + CSV UPGRADEREFS | upgrade_unittypes.csv, Yuanhang_Tao_13naval_units.ddf | DDF 4个升级块damage/range/reload同步CSV值 + 新增Ch055Epoch14Attack块 + CSV E14引用改为Ch055Epoch14Attack | — | 2026-05-24 |
| 076 | EE2X_db-053-Ch055A-DDF升级能力同步CSV-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | ZIP内部路径错误(缺EE2X_db/前缀)，游戏崩溃，已废弃 | 崩溃 | 2026-05-24 |
| 077 | EE2X_db-054-Ch055A-E14攻击1800递增-pre.zip | pre | Ch055A E11-E15 DAMAGE | upgrade_unittypes.csv, Yuanhang_Tao_13naval_units.ddf | E14 DAMAGE=1800基准，20%递增: E11(1042)/E12(1250)/E13(1500)/E14(1800)/E15(2160) | — | 2026-05-24 |
| 078 | EE2X_db-054-Ch055A-E14攻击1800递增-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 077修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 079 | EE2X_db-055-Ch055A-E14攻击2500递增-pre.zip | pre | Ch055A E11-E15 DAMAGE | upgrade_unittypes.csv, Yuanhang_Tao_13naval_units.ddf | E14 DAMAGE=2500基准，20%递增: E11(1447)/E12(1736)/E13(2083)/E14(2500)/E15(3000) | — | 2026-05-24 |
| 080 | EE2X_db-055-Ch055A-E14攻击2500递增-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 079修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 081 | EE2X_db-056-Ch055A-E14基准25递增-pre.zip | pre | Ch055A E11-E15 全属性+全成本 | upgrade_unittypes.csv, Yuanhang_Tao_13naval_units.ddf | 以其他开发者E14为基准，属性25%递增+成本30%递增，DDF同步，新增Ch055Epoch14Attack块 | — | 2026-05-24 |
| 082 | EE2X_db-056-Ch055A-E14基准25递增-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 081修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 083 | EE2X_db-057-舰载机E12-E15平滑重平衡-pre.zip | pre | NavalF18/ChinaPlane/RussianPlane E12-E15全时代 | upgrade_unittypes.csv, aircraftCarrier_plane.ddf | E14升级前为基准，每时代±20%平滑递增(HP/DAMAGE/RANGE/RELOAD/成本); 去掉Fighter_Improve_Reset和J161XAttack; E14引用专属DDF升级; 新增NavalF18Epoch14Attack/RussianPlaneEpoch14Attack | — | 2026-05-24 |
| 084 | EE2X_db-058-舰载机E12-E15平滑重平衡-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 083修改应用后的完整游戏ZIP — 已修复：初版ZIP因Python打包丢失EE2X_db/前缀导致崩溃，已用Compress-Archive重新打包修复 | 待测试 | 2026-05-24 已修复重打包 |
| 085 | EE2X_db-059-J15对齐ChinaPlane属性-pre.zip | pre | J15/J15_Naval(福建号航母舰载机) | Chinese_army.ddf, dbtechtreenode.csv | J15和J15_Naval DDF属性对齐ChinaPlane E14(HP1900/speed8.0/DMG808/RANGE14/ordnance28/LOS15); 科技树造价对齐(5,0,60,0,50,0,0,0,50,60,0); J35A不动 | — | 2026-05-24 |
| 086 | EE2X_db-060-J15对齐ChinaPlane属性-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 085修改应用后的完整游戏ZIP | 待测试 | 2026-05-24 |
| 087 | EE2X_db-061-E14防空四单位资源调整-pre.zip | pre | LightArtillery2/AntiAir_HQ61/PAC3/BUKM1_2 E14 | upgrade_unittypes.csv | 刺针取消铀改石油400; 红旗61取消铀改石油400; 爱国者3油250+铀250; 山毛榉取消铀改石油400 | — | 2026-05-24 |
| 088 | EE2X_db-061-E14防空四单位资源调整-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 087修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 089 | EE2X_db-062-刺针石油450-pre.zip | pre | LightArtillery2 E14 | upgrade_unittypes.csv | 刺针石油从400调为450 | — | 2026-05-24 |
| 090 | EE2X_db-062-刺针石油450-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 089修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 091 | EE2X_db-063-刺针E13石油450-pre.zip | pre | LightArtillery2 E13 | upgrade_unittypes.csv | 刺针E13取消铀改石油450 | — | 2026-05-24 |
| 092 | EE2X_db-063-刺针E13石油450-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 091修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 093 | EE2X_db-064-E13三国中程防空石油化-pre.zip | pre | AntiAir_HQ61/PAC3/BUKM1_2 E13 | upgrade_unittypes.csv | HQ61 E13铀改石油400; PAC3 E13铀改石油250+铀250; BUKM1_2 E13铀改石油400 | — | 2026-05-24 |
| 094 | EE2X_db-064-E13三国中程防空石油化-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 093修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 095 | EE2X_db-065-E14中远程防空射速速度部署-pre.zip | pre | E14中远程8防空单位 | upgrade_unittypes.csv, Chinese/American/Russian_army_lujun.ddf, Yuanhang_720_units.ddf | 中程: pack=1.0s, 射速+50%, 速度+30%; 远程: pack=1.5s, 射速+50%, 速度+30% | — | 2026-05-24 |
| 096 | EE2X_db-065-E14中远程防空射速速度部署-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 095修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 095 | EE2X_db-095-狙击手视野18-pre.zip | pre | Sniper(狙击手) E11-E15 | upgrade_unittypes.csv | E11 LOS 12→18; E13 LOS 13→18 | 已废弃 | 2026-05-24 |
| 096 | EE2X_db-096-狙击手视野18-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 095修改应用后的完整游戏ZIP | 已废弃 | 2026-05-24 |
| 097 | EE2X_db-097-狙击手老兵精英视野射程-pre.zip | pre | Sniper(狙击手) E11/E13老兵/精英 | upgrade_unittypes.csv, Yuanhang_720_units.ddf, dbtechtreenode.csv | 退役基础视野→老兵(16/16)+精英(18/18) | 已废弃 | 2026-05-24 |
| 098 | EE2X_db-098-狙击手老兵精英视野射程-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 097修改应用后的完整游戏ZIP | 崩溃 | 2026-05-24 |
| 099 | EE2X_db-099-对地攻击机溅射1.3-pre.zip | pre | JH7A/A10/su25 E14 溅射半径 | Chinese_army.ddf, American_army.ddf, Russian_army.ddf | JH7A(3.0→1.3)/A10(1.5→1.3)/su25(1.5→1.3)三机溅射统一为1.3 | — | 2026-05-24 |
| 100 | EE2X_db-099-对地攻击机溅射1.3-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 099修改应用后的完整游戏ZIP | 待测试 | 2026-05-24 |
| 101 | EE2X_db-101-歼20攻击力2000-歼20S攻击力2300-pre.zip | pre | J20/J20S E14攻击力 | Chinese_army.ddf | J20 damage 950→2000; J20S damage 900→2300 | — | 2026-05-24 |
| 102 | EE2X_db-101-歼20攻击力2000-歼20S攻击力2300-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 101修改应用后的完整游戏ZIP | 待测试 | 2026-05-24 |
| 103 | EE2X_db-103-中远程防空射速降75-pre.zip | pre | E14中远程8个防空单位 | upgrade_unittypes.csv, Yuanhang_Tao_13zhuangjia_units.ddf, American_army_lujun.ddf, Chinese_army_lujun.ddf, Russian_army_lujun.ddf | 中程HQ61/PAC3/BUKM1_2装填0.5→2.0; 远程Thaad装填0.75→3.0 + ZiYuan装填1.0→4.0 + American_THAAD/HQ9/Ru_S400装填0.75→3.0 | — | 2026-05-24 |
| 104 | EE2X_db-103-中远程防空射速降75-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 103修改应用后的完整游戏ZIP | 已废弃 | 2026-05-24 |
| 105 | EE2X_db-104-中程0.75s远程1.2s-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 中程0.75s/远程1.2s修正后的完整游戏ZIP | 待测试 | 2026-05-24 |
| 106 | EE2X_db-105-E14飞机移除石头-pre.zip | pre | J10B/JH7A/J11A/f16/A10/f14/mig29k/su25/su27 E14 | upgrade_unittypes.csv | 9架E14飞机生产STONE成本归零 | — | 2026-05-24 |
| 107 | EE2X_db-105-E14飞机移除石头-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 106修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 108 | EE2X_db-106-E14护卫舰HP9000速度19-pre.zip | pre | E14全部9艘护卫舰 | upgrade_unittypes.csv, aaship.ddf, Yuanhang_Tao_13naval_units.ddf | HP统一→9000, NavalMove速度统一→19 | — | 2026-05-24 |
| 109 | EE2X_db-106-E14护卫舰HP9000速度19-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 108修改应用后的完整游戏ZIP | 待测试 | 2026-05-24 |
| 110 | EE2X_db-107-驱逐舰HP射程攻击调整-pre.zip | pre | Ch052d/DDG123/Type22350/Ch055/Ticonderoga/Kirov E14 | Yuanhang_Tao_13naval_units.ddf | 052D级HP→16000/055级HP→26000,Type22350全属性补强 | — | 2026-05-24 |
| 111 | EE2X_db-109-驱逐舰CSV升级修正-pre.zip | pre | Ch052d/DDG123/Type22350/Ch055/Ticonderoga/Kirov E14 CSV | upgrade_unittypes.csv | 根因修复：DDF值被CSV覆盖，同时修正CSV中HP/DAMAGE/RANGE | — | 2026-05-24 |
| 112 | EE2X_db-110-驱逐舰CSV升级修正-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 109修改应用后的完整游戏ZIP（含DDF+CSV双重修正） | 待测试 | 2026-05-24 |
| 113 | EE2X_db-113-手动补更至v1.0.14-runtime.zip | runtime | 服务器补更(v1.0.10→1.0.14) | EE2X_db.zip 完整 | 手动下载并应用服务器1.0.12(海军)+1.0.13(UP1.6)+1.0.14(PC3反潜机)三包，同步到工作数据库 | 待测试 | 2026-05-24 |
| 114 | EE2X_db-114-PC3-rps-HeavyArtillery-to-Bomber-pre.zip | pre | PC3(伊尔38反潜机) RPS类型 | Yuanhang_Tao_740_units.ddf | PC3 rps=HeavyArtillery→Bomber，修复防空导弹和战斗机不攻击反潜机的问题 | — | 2026-05-25 |
| 115 | EE2X_db-114-PC3-RPS-Bomber-fix-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 114修改应用后的完整游戏ZIP | 待测试 | 2026-05-25 |
| 116 | EE2X_db-116-炼油厂化学厂去除种子资源费-pre.zip | pre | Oilref/Chemistry 建筑造价 | dbtechtreenode.csv | Oilref的OIL造价200→0; Chemistry的URANIUM造价200→0 | — | 2026-05-26 |
| 117 | EE2X_db-117-炼油厂化学厂去除种子资源费-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 116修改应用后的完整游戏ZIP | 待测试 | 2026-05-26 |
| 118 | EE2X_db-118-炼油厂化学厂调整为木500石500金500-pre.zip | pre | Oilref/Chemistry 建筑造价 | dbtechtreenode.csv | Oilref/Chemistry造价调整为WOOD=500/STONE=500/GOLD=500 | — | 2026-05-26 |
| 119 | EE2X_db-119-炼油厂化学厂调整为木500石500金500-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 118修改应用后的完整游戏ZIP | 待测试 | 2026-05-26 |
| 120 | EE2X_db-120-石油铀矿资源量2000-pre.zip | pre | ResourceOil/ResourceUranium 矿藏量 | resources.ddf | Oil/Uranium 地图矿藏 amount 1000→2000 | — | 2026-05-26 |
| 121 | EE2X_db-121-石油铀矿资源量2000-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 120修改应用后的完整游戏ZIP | 已废弃 | 2026-05-26 |
| 122 | EE2X_db-122-石油铀矿改为有限资源-pre.zip | pre | ResourceOil/ResourceUranium 有限化 | resources.ddf | Oil/Uranium 添加 alwaysExhaustible=1 改为有限资源 | — | 2026-05-26 |
| 123 | EE2X_db-123-石油铀矿改为有限资源-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 122修改应用后的完整游戏ZIP | 已废弃 | 2026-05-26 |
| 124 | EE2X_db-124-石油铀矿资源量5000-pre.zip | pre | ResourceOil/ResourceUranium 矿藏量 | resources.ddf | Oil/Uranium amount 2000→5000 | — | 2026-05-26 |
| 125 | EE2X_db-125-石油铀矿资源量5000-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 124修改应用后的完整游戏ZIP | 待测试 | 2026-05-26 |
| 126 | EE2X_db-126-酒馆采石场进驻25人-pre.zip | pre | Tavern/Quarry 进驻槽位 | Yuanhang_720_units.ddf | Tavern 30→25; Quarry 6→25 | — | 2026-05-26 |
| 127 | EE2X_db-127-酒馆采石场进驻25人-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 126修改应用后的完整游戏ZIP | 已废弃 | 2026-05-26 |
| 128 | EE2X_db-128-酒馆采石场采集速率0.8-pre.zip | pre | Tavern/Quarry 采集速率 | Yuanhang_720_units.ddf | Tavern/Quarry gatherRate 0.5→0.8 | — | 2026-05-26 |
| 129 | EE2X_db-129-酒馆采石场采集速率0.8-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 128修改应用后的完整游戏ZIP | 待测试 | 2026-05-26 |
| 130 | EE2X_db-130-三舰RPS防空-pre.zip | pre | Ch054A/FregattenFFG/Type22350 RPS类型 | Yuanhang_Tao_13naval_units.ddf | 三舰 rps 从 Destroyer 改为 AntiAircraft | — | 2026-05-26 |
| 130 | EE2X_db-130-三舰RPS防空-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 130修改应用后的完整游戏ZIP | 待测试 | 2026-05-26 |

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
| 048 | EE2X_db-048-launcher-changelog-pre.zip | pre | 启动器强制更新后跳过更新日志弹窗 | renderer.js | checkUpdateAndRender在source='after-update'时跳过showReleaseChangelog，直接markChangelogShown | — | 2026-05-24 |
| 111 | EE2X_db-111-PC3反潜机攻击HP调整-pre.zip | pre | PC3(伊尔38反潜机) E11/E13 | upgrade_unittypes.csv | HP 2000→1500(E11)/2500→1500(E13), DAMAGE 700→8000(E11)/900→8000(E13) | — | 2026-05-24 |
| 111 | EE2X_db-111-PC3反潜机攻击HP调整-runtime.zip | runtime | PC3(伊尔38反潜机) E11/E13 | EE2X_db.zip 完整 | 111修改应用后的完整游戏ZIP | 测试通过 | 2026-05-24 |
| 112 | EE2X_db-112-三舰防空统一E14-pre.zip | pre | Ch054A/Type22350/FregattenFFG E14 | Yuanhang_Tao_13naval_units.ddf, upgrade_unittypes.csv | 三舰E14统一HP=9000/Damage=2400/Range=55 | — | 2026-05-26 21:30 |
| 112 | EE2X_db-112-三舰防空统一E14-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 112修改应用后的完整游戏ZIP | 测试通过 | 2026-05-26 21:30 |
| 131 | EE2X_db-131-铀石油资源点数量5000改800-pre.zip | pre | ResourceOil/ResourceUranium 资源点 | resources.ddf | 铀和石油资源点amount从5000改为800 | — | 2026-05-26 |
| 131 | EE2X_db-131-铀石油资源点数量5000改800-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 131修改应用后的完整游戏ZIP | 待测试 | 2026-05-26 |
| 132 | EE2X_db-132-石金木资源点数量调整-pre.zip | pre | ResourceStone/ResourceGold/ResourceWoody | resources.ddf | 石头1000→1500、黄金1000→1500、树木30000→5000 | — | 2026-05-26 |
| 132 | EE2X_db-132-石金木资源点数量调整-runtime.zip | runtime | 游戏运行态快照 | EE2X_db.zip 完整 | 132修改应用后的完整游戏ZIP | 待测试 | 2026-05-26 |

## 旧格式全量快照（历史遗留）

| 备份包 | 大小 | 内容 | 说明 |
|:------|:-----|:-----|:-----|
| EE2X_db_original_20260518-1943.zip | 1.6 MB | 全部548个DB文件 | 项目初始原始数据库全量，仅作历史参考 |
| EE2X_db_backup_20260521_111948.zip | 1.7 MB | 全部506个DB文件 | dapao E14火箭弹修改前全量，已由精准备份覆盖 |

---

> **规则**: 新备份**只打包本次修改的文件**（通常2-3个），不打包全库。文件名使用中文简要描述。旧的全量快照已有精准备份覆盖，可视为冗余。
