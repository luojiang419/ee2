# scriptlibs_ee2x — 资料片编译场景脚本

## 基本信息
- **路径**: `Empire Earth II\scriptlibs_ee2x\`
- **类型**: 编译后的场景脚本DLL（资料片）
- **修改优先级**: 🟡 中（编译产物）
- **文件数量**: 25个 .dll + 1个 AI\ 子目录
- **修改方式**: 不可直接编辑，需修改源 .ies 文件后重新编译

## 文件列表

### 埃及战役脚本 (5个)
`EE2X_Egypt1.dll` ~ `EE2X_Egypt5.dll`

### 马赛战役脚本 (5个)
`EE2X_Maasai1.dll` ~ `EE2X_Maasai5.dll`

### 俄罗斯战役脚本 (5个)
`EE2X_Russian1.dll` ~ `EE2X_Russian5.dll`

### 独立战役脚本 (4个)
| 文件名 | 说明 |
|:-------|:-----|
| `EE2X_Kursk_German.dll` | 库尔斯克-德军 |
| `EE2X_Kursk_Russia.dll` | 库尔斯克-俄军 |
| `EE2X_Rorkes_British.dll` | 罗克渡口-英军 |
| `EE2X_Rorkes_Zulu.dll` | 罗克渡口-祖鲁 |

### 里程碑脚本
| 文件名 | 说明 |
|:-------|:-----|
| `EE2X_Milestone7.dll` | 里程碑7脚本 |

### AI子目录
| 文件名 | 大小 | 说明 |
|:-------|:-----|:-----|
| `AI_default.dll` | 229 KB | 默认AI皇冠系统 |
| `Eco_Crown.dll` | 258 KB | 经济皇冠系统 |
| `Imp_Crown.dll` | - | 帝国皇冠系统 |
| `Mil_Crown.dll` | - | 军事皇冠系统 |
| `EE2X_NativeTribes_Default.dll` | - | 土著部落默认AI |

## 与 scriptlibs\ 的关键差异
1. 包含资料片独占的战役脚本（埃及/马赛/俄罗斯/库尔斯克/罗克渡口）
2. AI子目录中的DLL体积更大（229KB vs 53KB），包含更多功能
3. 新增了 `EE2X_NativeTribes_Default.dll` 土著部落AI

## 关联文件
- 基础版脚本: `scriptlibs\`
- 资料片场景: `scenario_ee2x\`
- 土著AI: `aips_ee2x\EE2X_NativeTribes_*.aip`
