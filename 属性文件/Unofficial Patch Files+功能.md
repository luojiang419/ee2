# Unofficial Patch Files — UP1.5非官方补丁支持系统

## 基本信息
- **路径**: `Empire Earth II\Unofficial Patch Files\`
- **类型**: 模组支持/补丁管理
- **修改优先级**: 🟡 高
- **修改方式**: 文件替换、EXE生成器数据编辑、注册表配置

## 目录结构

```
Unofficial Patch Files\
├── EnabledUP15Units\              ← 启用UP1.5新单位的EXE
│   ├── EE2.exe                    (11.8 MB，含新单位)
│   └── EE2X.exe                   (30.3 MB，含新单位)
├── DisabledUP15Units\             ← 禁用UP1.5新单位的EXE
│   ├── EE2.exe                    (原版，无新单位)
│   └── EE2X.exe
├── EnabledUP15UnitsDX9\           ← DX9模式 + 启用UP1.5单位
├── DisabledUP15UnitsDX9\          ← DX9模式 + 禁用UP1.5单位
├── DX9SupportForUP15\             ← DirectX 9运行时支持
│   ├── d3d8.dll / d3d9.dll / ...  DX9 DLL文件
│   └── UP15.dll.safe15            安全备份
├── EXEGeneratorData\              ← ⭐ EXE生成器源数据（可修改）
│   ├── dbfont.csv.Source.*.txt    字体源数据
│   ├── EE2ExeSourcePart*          二进制补丁数据块
│   └── TextsSource.txt            12种语言翻译文本源
├── 1.5ExternalLauncherBitmaps\    ← 启动器位图资源
│   └── *.bmp (36个)               各版本启动画面
├── Checksums-data                 (2.7 KB) 校验和数据
├── Checksums-data-LargeAddressAware 大内存地址校验和
├── MinorVersion-data              (20 B) 次要版本号
├── DISABLE-SynapticsUseScrollCursor.reg  触摸板禁用注册表
├── ENABLE-SynapticsUseScrollCursor.reg   触摸板启用注册表
├── EE2.eu_Certificate.crt         SSL证书
├── TwoFingerScroll.exe            (1.4 MB) 双指滚动工具
├── ToastNotificationsLogo.png     通知图标
└── splash_*.bmp (47个)            各版本启动画面
```

## 核心功能

### 1. UP1.5单位开关
通过替换 `EE2X.exe` 来控制是否加载UP1.5新增单位：
- `EnabledUP15Units\` — 包含含新单位的EXE
- `DisabledUP15Units\` — 包含原版EXE
- 游戏运行时根据用户选择切换EXE文件

### 2. DirectX版本切换
- 默认使用DX8
- `EnabledUP15UnitsDX9\` / `DisabledUP15UnitsDX9\` 提供DX9模式

### 3. EXE生成器 (EXEGeneratorData\)
可以从源数据重新生成自定义的 `EE2X.exe`：
- 字体配置 (`dbfont.csv.Source.*.txt`)
- 二进制补丁 (`EE2ExeSourcePart*`)
- 多语言文本 (`TextsSource.txt`) — 12种语言

### 4. 启动器画面管理
- `1.5ExternalLauncherBitmaps\` 存放框架画面
- 根目录47个 `splash_*.bmp` 对应各版本

## 修改用途
- **切换UP1.5单位**: 在修改版和原版之间切换测试
- **自定义文本**: 编辑 `TextsSource.txt` 修改游戏中的显示文本（如版本名称"远航版"→"胜利版"）
- **注册表配置**: 调整触摸板滚动行为
- **自定义启动画面**: 替换 `.bmp` 文件

## 注意事项
- 修改 `TextsSource.txt` 时需同步更新 `zips\dbtext_cheats.utf8` 和 `EE2X_db\Text\dbtext_enums.utf8`
- EXE生成器涉及二进制补丁，修改需谨慎
- 各版本EXE文件为预编译二进制，不能直接编辑

## 关联文件
- 启动器配置: `UnofficialVersionConfig.txt`
- UP1.5 DLL: 根目录 `UP15.dll` / `UP15_GameHelper.dll`
- 文本同步: `zips\dbtext_cheats.utf8`
- 文件修改记录: `地2方案文档\修改文件清单_停火平民人口.md`
