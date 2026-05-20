# shaders — 基础版渲染着色器

## 基本信息
- **路径**: `Empire Earth II\shaders\`
- **类型**: 游戏渲染着色器
- **修改优先级**: 🟢 低（视觉修改，不影响游戏平衡）
- **文件数量**: 68个根文件 + 21个 vsh_psh\ 子目录文件
- **修改方式**: 可编辑着色器文件（高级图形修改）

## 目录结构

```
shaders\
├── *.NSB (二进制着色器包)
├── *.NSF (着色器片段)
├── *.vsh (顶点着色器)
├── *.psh (像素着色器)
├── NSBShaderLib.nl8 / NSBShaderLib.nl9 (着色器库)
└── vsh_psh\ (21个顶点/像素着色器文件)
```

## 主要着色器分类

### 视觉特效
| 文件 | 用途 |
|:-----|:-----|
| `AnimatedExplosion_*.NSB/NSF` | 爆炸动画 |
| `Electricspark.NSB` | 电火花 |
| `Smoke_1.NSB` | 烟雾 |
| `RainDropShader.NSB` | 雨滴 |
| `ClothShader.NSB` | 布料 |
| `FlagShader.NSB` | 旗帜 |
| `Grass.NSB` | 草地 |

### 环境
| 文件 | 用途 |
|:-----|:-----|
| `WaterShader.NSB` | 水面 |
| `Water_LOD_HIGH.NSB` | 水面高细节 |
| `SkyShader.NSB` | 天空 |
| `Font.NSB` | 字体渲染 |

### 通用渲染
| 文件 | 用途 |
|:-----|:-----|
| `Blend2Textures.NSB` | 双纹理混合 |
| `IndexPal20_High.NSB` | 索引调色板 |

## 引擎说明
- Gamebryo引擎的自定义着色器系统
- `.NSB` = NetImmerse Shader Binary
- `.NSF` = NetImmerse Shader Fragment
- `.vsh` / `.psh` = 标准顶点/像素着色器

## 关联文件
- 资料片着色器: `shaders_ee2x\`
