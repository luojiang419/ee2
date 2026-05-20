# aips_ee2x — 资料片AI人格系统

## 基本信息
- **路径**: `Empire Earth II\aips_ee2x\`
- **类型**: AI行为定义脚本（资料片扩展）
- **修改优先级**: 🔴 最高
- **文件数量**: ~90个 .aip 文件 + 3个 .h 头文件
- **修改方式**: 文本编辑器直接编辑 .aip 脚本

## 文件分类

### 文明模板（18个，比基础版多4个）
| 文件名 | 文明 | 说明 |
|:-------|:-----|:-----|
| `Civ_American.aip` | 美国 | |
| `Civ_Aztec.aip` | 阿兹特克 | |
| `Civ_Babylonian.aip` | 巴比伦 | |
| `Civ_Chinese.aip` | 中国 | |
| `Civ_Egyptian.aip` | 埃及 | |
| `Civ_English.aip` | 英国 | |
| `Civ_French.aip` | 法国 | **资料片新增** |
| `Civ_German.aip` | 德国 | |
| `Civ_Greek.aip` | 希腊 | |
| `Civ_Inca.aip` | 印加 | |
| `Civ_Japanese.aip` | 日本 | |
| `Civ_Korean.aip` | 韩国 | |
| `Civ_Maasai.aip` | 马赛 | **资料片新增** |
| `Civ_Mayan.aip` | 玛雅 | |
| `Civ_Roman.aip` | 罗马 | |
| `Civ_Russian.aip` | 俄罗斯 | **资料片新增** |
| `Civ_Turkish.aip` | 土耳其 | |
| `Civ_Zulu.aip` | 祖鲁 | **资料片新增** |

### 资料片战役AI
| 文件名 | 战役 | 说明 |
|:-------|:-----|:-----|
| `EE2X_E1BlackSun.aip` ~ `EE2X_E5_Theban.aip` | 埃及战役 (5个) | 埃及各关AI |
| `EE2X_M1_Badguys.aip` ~ `EE2X_M5_Omega.aip` | 马赛战役 (5个) | 马赛各关AI |
| `EE2X_R2France.aip` ~ `EE2X_R5Prussia.aip` | 俄罗斯战役 (4个) | 俄罗斯各关AI |
| `EE2X_Kursk_German.aip` / `EE2X_Kursk_Russian.aip` | 库尔斯克战役 | 德/苏双方AI |

### 土著部落系统（资料片新增特性）
| 文件名 | 说明 |
|:-------|:-----|
| `EE2X_NativeTribes_Berserk.aip` | 狂暴土著部落AI |
| `EE2X_NativeTribes_Default.aip` | 默认土著部落AI |
| `EE2X_NativeTribes.h` | 土著部落头文件 |

### 策略模板和头文件
与基础版 `aips\` 类似，包含 `Eco_*/Imp_*/Mil_*` 策略模板，以及 `AIPDefaults.h` 和 `AipStructures.h` 头文件。

## 与 aips\ 的关键差异
1. **新文明**: 增加了 French/Maasai/Russian/Zulu 四个文明
2. **新战役**: 埃及/马赛/俄罗斯/库尔斯克完整战役AI
3. **土著部落**: 全新的土著部落AI子系统
4. **文件名变化**: 策略模板内容和基础版可能有数值差异

## 关联文件
- 基础版AI: `aips\`
- 文明定义: `zips_ee2x\EE2X_db\Civilizations\*.ddf`
- 战役场景: `scenario_ee2x\`
