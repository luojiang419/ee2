# scriptlibs — 基础版编译场景脚本

## 基本信息
- **路径**: `Empire Earth II\scriptlibs\`
- **类型**: 编译后的场景脚本DLL
- **修改优先级**: 🟡 中（编译产物，修改需编辑器或编译工具）
- **文件数量**: 33个 .dll + 1个 AI\ 子目录
- **修改方式**: 不可直接编辑，需修改源 .ies 文件后重新编译

## 文件列表

### 美国战役脚本 (8个)
`American1.dll` ~ `American8.dll` (344 KB - 618 KB)

### 德国战役脚本 (8个)
`German1.dll` ~ `German8.dll` (135 KB - 536 KB)

### 韩国战役脚本 (8个)
`Korean1.dll` ~ `Korean8.dll` (77 KB - 430 KB)

### 转折点脚本 (4个)
| 文件名 | 说明 |
|:-------|:-----|
| `normandy_allies.dll` | 诺曼底-盟军 |
| `normandy_german.dll` | 诺曼底-德军 |
| `ThreeKingdoms_Wei.dll` | 三国-魏 |
| `ThreeKingdoms_Wu.dll` | 三国-吴 |

### 教程脚本 (4个)
`tutorial1.dll` ~ `tutorial4.dll`

### AI子目录
| 文件名 | 说明 |
|:-------|:-----|
| `AI_default.dll` (53 KB) | 默认AI皇冠系统 |
| `Eco_Crown.dll` (61 KB) | 经济皇冠系统 |
| `Imp_Crown.dll` (61 KB) | 帝国皇冠系统 |
| `Mil_Crown.dll` (61 KB) | 军事皇冠系统 |

## 编译关系
```
Scripts\*.ies  →  (编译工具)  →  scriptlibs\*.dll
```

## 关联文件
- 源脚本: `Scripts\` (.ies)
- 资料片脚本: `scriptlibs_ee2x\`
- 场景文件: `scenario\`
