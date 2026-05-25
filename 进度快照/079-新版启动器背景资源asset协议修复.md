# 进度快照 079 — 新版启动器背景资源 asset 协议修复

> 日期: 2026-05-25

---

## 已完成内容

### 1. 已定位安装版背景图片/视频不显示的根因

- 浏览器预览模式可显示背景图/视频
- 安装版客户端选择并导入背景文件后不显示
- 根因不是文件没保存，而是：
  - `import_background_media` 已把文件正确导入到应用数据目录
  - 前端使用 `convertFileSrc(path)` 生成本地资源 URL
  - 但 `tauri.conf.json` 未启用 `assetProtocol`
  - 安装版 WebView 无权访问这些本地导入文件

### 2. 已启用 Tauri 2 asset protocol

- 修改文件：`EE2X魔改版启动器/src-tauri/tauri.conf.json`
- 已新增：
  - `app.security.assetProtocol.enable = true`
  - `scope` 允许访问：
    - `$APPDATA/backgrounds/**`
    - `$APPLOCALDATA/backgrounds/**`
    - `$APPCONFIG/backgrounds/**`

### 3. 依赖锁文件已同步更新

- 修改文件：`EE2X魔改版启动器/src-tauri/Cargo.lock`
- 由于启用 asset protocol，构建时引入相关依赖并刷新锁文件

### 4. 构建验证

- `npm run build:frontend`：通过
- `npm exec tauri build`：通过
- 当前安装包：
  - `EE2X魔改版启动器/src-tauri/target/release/bundle/nsis/EE2X魔改版启动器_1.0.1_x64-setup.exe`

---

## 当前修改到的模块

- `EE2X魔改版启动器/src-tauri/tauri.conf.json`
- `EE2X魔改版启动器/src-tauri/Cargo.lock`

---

## 待办清单

- [ ] 安装新版安装包后重新选择一次背景图片/视频，确认首页与设置页预览都可正常显示
- [ ] 如仍异常，继续抓取安装版 WebView 控制台和 `convertFileSrc()` 生成 URL 做第二轮排查

---

## 下一步

- 提交并推送本轮背景资源协议修复
