# zips — 基础版数据库与资源包

## 基本信息
- **路径**: `Empire Earth II\zips\`
- **类型**: 游戏核心数据（基础版）
- **修改优先级**: 🔴 最高
- **修改方式**: 解压ZIP → 编辑CSV/DDF → 重新打包或放置同名文件夹覆盖
- **与资料片关系**: 资料片 `zips_ee2x\` 会覆盖同名文件，修改时需确认以哪个版本为准

## 目录内容

### 数据库ZIP（6个）
| 文件名 | 大小 | 内容 |
|:-------|:-----|:-----|
| `db.zip` | 0.9 MB | 初始版数据库 |
| `db_110.zip` | 27.9 MB | v1.1 数据库 |
| `db_120.zip` | 46.5 MB | v1.2 数据库 |
| `db_150.zip` | 109.8 MB | v1.5 数据库 |
| `db_155.zip` | 1.8 MB | v1.5.5 增量 |
| `db_158_protected.zip` | 268 B | v1.5.8 锁定占位文件 |

### 资源ZIP（10个）
| 文件名 | 大小 | 内容 |
|:-------|:-----|:-----|
| `graphics.zip` | 79.4 MB | 基础版图形资源 |
| `graphics_110.zip` | 63 KB | v1.1 图形增量 |
| `graphics_120.zip` | 122 KB | v1.2 图形增量 |
| `Graphics_LoewAmbientPack_160.zip` | 34.6 MB | v1.6 环境包 |
| `textures.zip` | 288.8 MB | 基础版纹理 |
| `textures_120.zip` | 541 KB | v1.2 纹理增量 |
| `Textures_160.zip` | 266 MB | v1.6 纹理 |
| `Textures_enh_160.zip` | 1.45 GB | v1.6 增强纹理 |
| `Textures_terrain_160.zip` | 59.7 MB | v1.6 地形纹理 |
| `sounds.zip` | 140.3 MB | 基础版音效 |
| `sounds_2024.zip` | 1.5 MB | 2024年音效更新 |
| `hdrs.zip` | 125 KB | HDR环境贴图 |
| `fonts.zip` | 466 KB | 字体文件 |
| `LoewCampaigns_160.zip` | 56.2 MB | v1.6 扩展战役 |

### CSV数据文件（可直接编辑，11个）
| 文件名 | 说明 |
|:-------|:-----|
| `DbSeasonalTextureSets_Arid.csv` | 干旱季节纹理集 |
| `DbSeasonalTextureSets_Temperate.csv` | 温带季节纹理集 |
| `DbSeasonalTextureSets_Tropical.csv` | 热带季节纹理集 |
| `DbSeasonalTextureSets_Tundra.csv` | 冻土季节纹理集 |
| `dbterraintexture_arid.csv` | 干旱地形纹理 |
| `dbterraintexture_temperate.csv` | 温带地形纹理 |
| `dbterraintexture_tropical.csv` | 热带地形纹理 |
| `dbterraintexture_tundra.csv` | 冻土地形纹理 |
| `dbsprite_unitUnofficialPatch_packed.csv` | UP1.5单位精灵数据（增强版） |
| `dbsprite_unitUnofficialPatchNonEnh_packed.csv` | UP1.5单位精灵数据（非增强版） |
| `dbtext_cheats.utf8` | 作弊码文本/游戏选项枚举文本 |

### 子目录（解压覆盖用）
| 目录 | 内容 |
|:-----|:-----|
| `graphics\` | 解压的图形覆盖文件 |
| `graphics_130\` ~ `graphics_132\` | 各版本图形增量 |
| `graphics_loewambientpack_150\` | v1.5 环境包图形 |
| `textures\` | 解压的纹理覆盖文件 |
| `textures_130\` ~ `textures_133\` | 各版本纹理增量 |
| `textures_loewambientpack_150\` | v1.5 环境包纹理 |
| `textures_pc\` | PC平台专用纹理 |

### 其他文件
| 文件名 | 说明 |
|:-------|:-----|
| `GameSpy_logo.dds` / `GameSpy_logo.tga` | GameSpy联机平台Logo |

## 与 zips_ee2x 的关系

- **加载优先级**: 资料片文件优先于基础版文件
- **修改策略**: 如果同时存在基础版和资料片的同名定义，资料片会覆盖基础版
- **文本文件注意**: `zips\dbtext_cheats.utf8` 和 `EE2X_db\Text\dbtext_enums.utf8` 都需要修改，否则可能导致下拉菜单错位

## 修改用途
- 基础游戏使用的数据源
- 地形纹理和季节系统
- UP1.5单位的精灵数据
- 游戏选项枚举文本（与资料片文本需同步）
- 增强纹理包（1.45GB，影响游戏视觉质量）

## 关联文件
- 资料片数据: `zips_ee2x\` 目录
- CS结构对比: `地2方案文档\修改版与原版CSV结构对比.md`
- 文件修改清单: `地2方案文档\修改文件清单_停火平民人口.md`
