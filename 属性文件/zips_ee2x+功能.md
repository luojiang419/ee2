# zips_ee2x — 资料片数据库与资源包

## 基本信息
- **路径**: `Empire Earth II\zips_ee2x\`
- **类型**: 游戏核心数据
- **修改优先级**: 🔴 最高（单位属性修改的核心目标）
- **修改方式**: 解压ZIP → 编辑CSV/DDF → 重新打包或放置同名文件夹覆盖

## 目录内容

### ZIP压缩包（7个）
| 文件名 | 大小 | 内容 |
|:-------|:-----|:-----|
| `EE2X_db.zip` | 1.5 MB | 资料片数据库（单位/科技/文明/文本/UI） |
| `EE2X_db_155.zip` | 48 KB | v1.5.5 增量更新 |
| `EE2X_db_156.zip` | 456 KB | v1.5.6 增量更新 |
| `EE2X_graphics.zip` | 15.4 MB | 资料片图形资源（模型/贴图/图标） |
| `EE2X_textures.zip` | 47.7 MB | 资料片纹理贴图 |
| `EE2X_sounds.zip` | 23.3 MB | 资料片音效 |
| `EE2X_hdrs.zip` | 135 KB | 资料片HDR/光照数据 |
| `EE2X_fonts.zip` | 418 KB | 资料片字体文件 |

### 头文件（3个）
| 文件名 | 大小 | 说明 |
|:-------|:-----|:-----|
| `DbFormationDefs.h` | 6.9 KB | 编队定义枚举 |
| `DbFrontEndDefs.h` | 8.2 KB | 前端UI选项枚举（停火时间/公民数量/人口上限/比赛模式） |
| `GDbDisplayDefs.h` | 4.5 KB | 显示定义枚举 |

### 文本文件（1个）
| 文件名 | 说明 |
|:-------|:-----|
| `dbtext_cheats.utf8` | 作弊码文本 |

## 数据库解压后结构 (EE2X_db\)

```
EE2X_db\
├── Civilizations\          文明定义
│   ├── WesternCivs.ddf     西方文明（法/英/德/罗/希/土）
│   ├── FarEastCivs.ddf     远东文明（中/日/韩）
│   ├── MesoAmerCivs.ddf    中美洲文明（阿兹特克/印加/玛雅）
│   ├── MiddleEastCivs.ddf  中东文明（巴比伦/埃及）
│   └── AfricanCivs.ddf     非洲文明（马赛/祖鲁）
│
├── Simulation\             战斗模拟数据
│   ├── dbcombat_unittypeadjust.csv  兵种克制伤害调整表 ⭐
│   └── dbunittypeattributes.ddf     单位类型属性族定义
│
├── TechTree\               科技树系统 ⭐⭐⭐
│   ├── dbtechtreenode.csv          科技树节点总表（1860行）⭐⭐⭐
│   ├── upgrade_unittypes.csv       单位升级属性表（1467行）⭐⭐⭐
│   ├── upgrade_factorset.csv       属性因子修改表（516行）⭐⭐
│   ├── epoch1_upgrades.ddf         时代1自动/手动升级集
│   ├── epoch2_upgrades.ddf         时代2升级集
│   ├── ...                        （时代3-14同理）
│   ├── epoch15_upgrades.ddf        时代15升级集
│   └── civ_reg_bonus_upgrades.ddf  文明加成升级集
│
├── Units\                  单位定义
│   ├── *.ddf                       各单位/建筑类型定义文件
│   ├── Tao_Ship_FarEast.ddf        远东特色船只
│   ├── Tao_Ship_Western.ddf       西方/区域特色船只
│   └── Tao_Academy.ddf            陆军研究院建筑
│
├── Text\                   文本/本地化
│   ├── dbtext_enums.utf8           枚举选项文本
│   ├── dbtext_unittypenames.utf8   单位显示名称
│   └── dbtext_unittypetips.utf8    单位提示文本
│
└── UI\                     界面定义
    └── *.ddf                       UI布局/样式
```

## 核心文件详解

### 1. dbtechtreenode.csv（科技树节点总表）
**最重要**的查询入口。每一行定义一个科技节点，包含：
- `NAME` — 节点唯一名称
- `Epoch` / `AvailableEpoch` — 所属时代/可用时代
- `HOST` — 归属建筑（如 Barracks/Stable/Dock/Citizen/ArmyAcademy）
- `PRODUCE` — 产出物（单位/升级/属性名）
- `UPGRADE` — 指向 upgrade_unittypes.csv 的升级名
- `MENU` / `ROW` / `COL` — UI面板位置
- `RPS` — 兵种克制类型
- `COST` — 研究/训练资源造价
- `Civilization` — 文明限定
- `SPECFLAGS` — 特殊标记（如 CivAttribute 表示文明天赋）

### 2. upgrade_unittypes.csv（单位升级属性表）
每个单位/升级的**具体数值**所在：
- `UPGRADE` — 升级名（主键）
- `HP` — 生命值
- `DAMAGE` / `RANGE` / `RELOAD` / `LOS` — 战斗属性
- `BUILDTIME` — 建造/训练时间
- `FOOD` / `WOOD` / `STONE` / `GOLD` / `TIN` / `IRON` / `SALTPETER` / `OIL` / `URANIUM` — 各资源造价
- `POPCAP` — 人口占用
- `ICON` — UI图标
- `VISUAL` — 3D模型
- `UPGRADEREFS` — 子升级引用

### 3. upgrade_factorset.csv（属性因子表）
通过因子方式修改单位属性：
- `FACTOR` — 因子名
- `TARGET` — 目标单位类型族
- `METHOD` — 修改方式（AddPermMul=加永久乘数, AddTemp=加临时值 等）
- `VALUE` — 修改数值
- `TYPE` — 属性类型（HitPoints/Damage/Speed 等）

### 4. Units/*.ddf（单位定义文件）
定义单位的3D模型、能力和物理参数：
- `UnitType` — 单位类型名
- `rps` — RPS克制类型（决定单位属于哪个克制链）
- `popCount` — 实际人口消耗（船只的人口在这里，CSV里的无效）
- `UpgradeAbilities` — 升级获得的能力
- `UpgradeSize` — 升级改变的模型大小
- `areaDamageRadius` / `areaDamageFriendlyRatio` — 范围伤害参数
- `ForceScale` — 模型缩放
- `ChildNames` — 子模型名称

### 5. dbcombat_unittypeadjust.csv（战斗克制调整表）
定义兵种间的伤害修正：
- 行 = 攻击方单位类型
- 列 = 防御方单位类型
- 值 = 伤害倍率

### 6. dbunittypeattributes.ddf（单位类型属性族）
定义单位类型的属性分组，用于 upgrade_factorset.csv 中的 TARGET 引用。

## 修改注意事项

### ⚠️ CSV vs DDF 优先级
- DDF 中的 `UpgradeAbilities` 和 `UpgradeSize` **会覆盖** CSV 中的同名属性
- 修改单位数值后务必检查对应 DDF 是否有冲突定义

### ⚠️ 名称一致性
- `dbtechtreenode.csv` 的 UPGRADE 列值必须能在 `upgrade_unittypes.csv` 中找到
- 名称大小写敏感（如 `guichuan` 是小写g）
- 引用错误会导致升级静默失效，游戏中无任何提示

### ⚠️ 资源合法性检查
修改科技/单位造价前验证资源时代可用性：
| 资源 | 可用时代 |
|:-----|:---------|
| Tin (锡) | E1-E6 |
| Iron (铁) | E4-E9 |
| Saltpeter (硝石) | E7-E12 |
| Oil (石油) | E10-E15 |
| Uranium (铀) | E13-E15 |

### ⚠️ 行号依赖
- CSV行号变更后，如果外部工具按行号引用数据会导致错误
- 确保所有引用使用名称查找而非位置索引

### ⚠️ 文本同步
修改选项/枚举数量时，需同步更新：
- `DbFrontEndDefs.h`（枚举定义）
- `Text/dbtext_enums.utf8`（枚举文本）
- `zips/dbtext_cheats.utf8`（基础版文本）

## 关联文件
- 基础版数据: `zips\` 目录
- AI系统: `aips_ee2x\` 目录
- 文明定义链: `地2方案文档\文明属性生效数据链.md`
- 标准修改流程: `地2方案文档\数据查找标准流程指南.md`
- EXE硬编码: `EE2X.exe`
