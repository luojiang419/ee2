# shaders_ee2x — 资料片渲染着色器

## 基本信息
- **路径**: `Empire Earth II\shaders_ee2x\`
- **类型**: 资料片增强渲染着色器
- **修改优先级**: 🟢 低（视觉修改）
- **修改方式**: 编辑着色器文件

## 目录结构（9个子目录）

| 子目录 | 内容 | 说明 |
|:-------|:-----|:-----|
| `Binary\` | ~60个 .NSB 文件 | 所有类型着色器编译版 |
| `Documentation\` | `SkinSolid_README.txt` | 皮肤/固体着色器说明 |
| `ImageFilters\` | 6个 .NSF 文件 | 后处理滤镜（HDR/高斯模糊） |
| `ShaderPrograms_Pixel\` | 7个 .psh 文件 | 像素着色器程序 |
| `ShaderPrograms_Vertex\` | 4个 .vsh 文件 | 顶点着色器程序 |
| `Skin\` | 10个 .NSF 文件 | 单位皮肤着色 |
| `Solid\` | 13个 .NSF 文件 | 固体物体着色 |
| `Terrain\` | (空) | 地形着色预留 |
| `Water\` | 9个 .NSF 文件 | 水面渲染 |

## 资料片新增功能

### HDR渲染
- `HDRFinal.NSF` — HDR最终合成
- `HDRGlare1.NSF` / `HDRGlare2.NSF` — 眩光效果

### 高斯模糊
- `Gaussian_4Samp.NSF` — 4采样高斯模糊
- `Gaussian_6Samp.NSF` — 6采样高斯模糊

### 半球光照模型
- `HemisphereLighting.psh` — 半球光照
- `HemisphereLighting_Dark.psh` — 暗面半球光照
- `HemisphereLighting_Spec.psh` — 带高光的半球光照

### 黑白滤镜
- `BlackAndWhite.NSF` — 黑白后处理效果

### 皮肤/固体渲染
- `SkinHigh_*.NSF` — 高质量皮肤渲染（高/中/低LOD）
- `Solid_*.NSF` — 固体物体渲染（高/中/低LOD）

## 与 shaders\ 的关系
- `shaders_ee2x\` 基于 `shaders\` 扩展
- 新增HDR、半球光照、皮肤渲染等高级特性
- 资料片运行时优先读取此目录

## 关联文件
- 基础版着色器: `shaders\`
