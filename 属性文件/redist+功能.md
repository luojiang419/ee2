# redist — 音频引擎运行时库

## 基本信息
- **路径**: `Empire Earth II\redist\`
- **类型**: 系统运行库
- **修改优先级**: ⚪ 不修改（系统库文件）
- **文件数量**: 10个
- **修改方式**: 不可修改

## 文件列表

### Miles Sound System (MSS) 音频引擎
| 文件名 | 大小 | 说明 |
|:-------|:-----|:-----|
| `mss32.dll` | 373 KB | 核心音频引擎库 |
| `mssa3d.m3d` | - | A3D 3D音频驱动 |
| `mssds3d.m3d` | - | DirectSound3D 音频驱动 |
| `mssdx7.m3d` | - | DirectX7 音频驱动 |
| `msseax.m3d` | - | EAX环境音效驱动 |
| `mssrsx.m3d` | - | RSX 3D音频驱动 |
| `msssoft.m3d` | - | 软件3D音频 |
| `mssdsp.flt` | - | DSP音频滤镜 |
| `mssmp3.asi` | - | MP3解码器 |
| `mssvoice.asi` | - | 语音编解码器 |

## 功能说明
- Miles Sound System 是游戏行业常用的音频中间件
- 提供3D音频定位、MP3解码、环境音效等功能
- 这些文件是游戏声音系统的基础依赖
- **绝对不要删除或修改这些文件**，否则游戏将没有声音

## 关联文件
- 根目录 `mss32.dll` (372 KB)
- 音效资源: `zips\sounds.zip`
