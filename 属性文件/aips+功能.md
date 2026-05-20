# aips — 基础版AI人格系统

## 基本信息
- **路径**: `Empire Earth II\aips\`
- **类型**: AI行为定义脚本
- **修改优先级**: 🔴 最高
- **文件数量**: ~130个 .aip 文件 + 2个 .h 头文件
- **修改方式**: 文本编辑器直接编辑 .aip 脚本

## 文件分类

### AI核心脚本（基础行为模板）
| 文件名 | 大小 | 说明 |
|:-------|:-----|:-----|
| `aggressive.aip` | 23 KB | 进攻型AI核心脚本 |
| `passive.aip` | 23 KB | 防守型AI核心脚本 |
| `default.aip` | 9 KB | 默认AI行为 |
| `Lookbusy.aip` | 9 KB | 伪装忙碌AI（用于中立/被动单位） |
| `Deathmatch.aip` | - | 死斗模式专用AI |
| `NormalResources.aip` | - | 标准资源模式AI |
| `GermanWW2.aip` | - | 德国二战特定AI |

### 文明模板（14个基础版文明）
| 文件名 | 文明 | 说明 |
|:-------|:-----|:-----|
| `Civ_American.aip` | 美国 | 文明特定建造策略 |
| `Civ_Aztec.aip` | 阿兹特克 | 文明特定建造策略 |
| `Civ_Babylonian.aip` | 巴比伦 | 文明特定建造策略 |
| `Civ_Chinese.aip` | 中国 | 文明特定建造策略 |
| `Civ_Egyptian.aip` | 埃及 | 文明特定建造策略 |
| `Civ_English.aip` | 英国 | 文明特定建造策略 |
| `Civ_German.aip` | 德国 | 文明特定建造策略 |
| `Civ_Greek.aip` | 希腊 | 文明特定建造策略 |
| `Civ_Inca.aip` | 印加 | 文明特定建造策略 |
| `Civ_Japanese.aip` | 日本 | 文明特定建造策略 |
| `Civ_Korean.aip` | 韩国 | 文明特定建造策略 |
| `Civ_Mayan.aip` | 玛雅 | 文明特定建造策略 |
| `Civ_Roman.aip` | 罗马 | 文明特定建造策略 |
| `Civ_Turkish.aip` | 土耳其 | 文明特定建造策略 |

### 经济/军事/帝国策略模板
按阶段和重点分类：

| 前缀 | 含义 | 变体 |
|:-----|:-----|:-----|
| `Eco_*.aip` | 经济侧重 | AirEpoch, Expand, Navy, NavyAirEpoch, NavyLateEpoch |
| `Mil_*.aip` | 军事侧重 | AirEpoch, Expand, Navy, NavyAirEpoch, NavyLateEpoch |
| `Imp_*.aip` | 帝国侧重 | AirEpoch, Expand, Navy, NavyAirEpoch, NavyLateEpoch |

### 遭遇战难度模板
| 文件名 | 说明 |
|:-------|:-----|
| `Skirmish_Default.aip` | 默认难度（22KB，最完整） |
| `Skirmish_Easiest.aip` | 最简单 |
| `Skirmish_Easy.aip` | 简单 |
| `Skirmish_Medium.aip` | 中等 |
| `Skirmish_Hard.aip` | 困难 |
| `Skirmish_Hardest.aip` | 最困难 |

### 战役场景AI（~100个）
命名规则：`{战役代号}{编号}{描述}.aip`

| 战役前缀 | 代表战役 |
|:---------|:---------|
| `A1-A8` | 美国战役 (America) |
| `G1-G8` | 德国战役 (Germany) |
| `K1-K8` | 韩国战役 (Korea) |
| `T1-T2` | 转折点 (Turning Points) |
| `Tu1-Tu4` | 教程 (Tutorial) |
| `E3Map2` / `E3Map3BadGuy` | 特殊地图AI |

### 头文件（2个）
| 文件名 | 大小 | 说明 |
|:-------|:-----|:-----|
| `AIPDefaults.h` | 9 KB | AI默认参数定义 |
| `AipStructures.h` | 6 KB | AI建筑结构定义 |
| `Mil_Default.h` | 15 KB | 军事默认参数定义 |

## 修改用途
- 调整AI建造优先级和顺序
- 修改AI资源采集策略
- 调整AI军事进攻时机和力度
- 更改文明特定的科技研发顺序
- 设置遭遇战各难度的行为差异

## 关联文件
- 资料片AI: `aips_ee2x\`
- 难度参数: `config_EE2X.cfg` 中的 handicap 倍率
- 科技树: `zips_ee2x\EE2X_db\TechTree\dbtechtreenode.csv`
