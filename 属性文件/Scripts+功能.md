# Scripts — 源脚本文件 (.ies)

## 基本信息
- **路径**: `Empire Earth II\Scripts\`
- **类型**: 场景源脚本
- **修改优先级**: 🟡 高
- **文件数量**: 3个 .ies 文件
- **修改方式**: 文本编辑器编辑 .ies 源文件

## 文件列表
| 文件名 | 大小 | 说明 |
|:-------|:-----|:-----|
| `Berlin.ies` | 2.8 KB | 柏林场景脚本源文件 |
| `Boston.ies` | 9.9 KB | 波士顿场景脚本源文件 |
| `ScriptExampleTutorial1.ies` | 60 KB | 官方脚本教程示例 |

## 文件格式
- `.ies` = **I**mpire **E**arth **S**cript
- 文本格式，可编辑
- 编译后的产物是 `scriptlibs\` 中的 `.dll` 文件
- 包含场景触发器、目标系统、对话逻辑等

## 修改用途
- 编写自定义场景脚本
- 修改现有场景的逻辑行为
- 创建新的战役触发器和事件

## 编译关系
```
Scripts\*.ies  →  (编译)  →  scriptlibs\*.dll  →  (加载)  →  scenario\*.scn
```

## 关联文件
- 编译产物: `scriptlibs\` 和 `scriptlibs_ee2x\`
- 场景文件: `scenario\` 和 `scenario_ee2x\`
- 文档参考: `Scripting Docs\`
