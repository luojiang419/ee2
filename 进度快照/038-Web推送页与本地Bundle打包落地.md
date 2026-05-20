# 进度快照 038 — Web推送页与本地Bundle打包落地

> 日期: 2026-05-21

---

## 已完成内容

### 1. Flutter 发布端已改造成纯本地更新包打包器

- 不再在启动时读取远端版本、历史或发布配置
- 保留原有：
  - 根目录选择
  - 文件树勾选
  - 版本号填写
  - 更新说明填写
  - 启动器安全预设
- 主按钮已改为：
  - `生成并保存更新包`
- 点击后会先弹出保存窗口，再执行本地导出
- 默认导出文件名：
  - `EE2X-release-{releaseId}.zip`

### 2. bridge CLI 已新增单文件导出命令

- 新增命令：
  - `export-bundle`
- 逻辑为：
  1. 先调用现有双包构建逻辑生成 `releaseDir`
  2. 再把整个 `releaseDir` 封装为一个外层 ZIP
  3. 最终输出单个 bundle 文件

### 3. 双包元数据已扩展 bundle 标识

- `release-meta.json` 已新增：
  - `bundleFormat = "ee2x-release-bundle"`
  - `bundleVersion = 1`
- 作为 Web 端上传校验锚点

### 4. 3010 后端已新增 bundle 发布接口

- 保留原有：
  - `POST /api/update/v1/releases/publish`
- 新增：
  - `POST /api/update/v1/releases/publish-bundle`
- 新接口会：
  1. 先流式落盘外层 bundle ZIP
  2. 安全解压到临时目录
  3. 校验 `release-meta.json` / 两份 manifest / 两份内层 ZIP
  4. 复用现有 `publish_release` 入库与 `latest.json` 生成逻辑

### 5. 3010 后端已新增 Web 推送页

- 新页面入口：
  - `GET /publish/`
- 静态资源路径：
  - `GET /publish/assets/*`
- 当前页面能力：
  - 输入并保存 publish token（仅 sessionStorage）
  - 上传单个 bundle ZIP
  - 显示上传进度
  - 读取当前版本与历史
  - 删除历史版本
- 首版固定发布到服务端默认频道

### 6. 文档与测试已同步

- 已更新：
  - `更新器/docs/发布协议.md`
  - `更新器/docs/服务器部署说明.md`
- 已完成验证：
  - Python `compileall`
  - `flutter analyze`
  - 本地最小烟雾：
    - `export-bundle`
    - `publish-bundle`
    - `history`
    - `delete`
- 已补充 `publisher/smoke_test.py` 的 bundle 发布路径

---

## 当前修改到的模块

- `更新器/flutter_publish_tool/lib/main.dart`
- `更新器/src/ee2x_update_suite/bridge/__main__.py`
- `更新器/src/ee2x_update_suite/publisher/http_backend.py`
- `更新器/src/ee2x_update_suite/publisher/smoke_test.py`
- `更新器/src/ee2x_update_suite/shared/constants.py`
- `更新器/src/ee2x_update_suite/shared/manifest_builder.py`
- `更新器/update_backend_mg/app/main.py`
- `更新器/update_backend_mg/app/service.py`
- `更新器/update_backend_mg/app/publish/`
- `更新器/docs/发布协议.md`
- `更新器/docs/服务器部署说明.md`

---

## 待办清单

- [ ] 在 Windows 上手动打开 `ee2x_publish_tool.exe` 肉眼确认：
  - 保存对话框正常弹出
  - 取消保存时不会产生 bundle
  - 成功保存后提示文案正确
- [ ] 将 `update_backend_mg` 部署到真实 3010 环境
- [ ] 用浏览器实测 `/publish/` 页面：
  - token 保存
  - bundle 上传
  - 历史刷新
  - 删除 latest 自动回退
- [ ] 如确认不再需要桌面端回退逻辑，可后续清理 Flutter 内保留的 legacy publish/history helper

---

## 下一步

- 先在 Windows 上直接运行：
  - `更新器/dist/ee2x-flutter-publisher/ee2x_publish_tool.exe`
- 然后在部署后的 3010 服务上访问：
  - `/publish/`
- 重点确认三件事：
  1. 本地 bundle 保存体验是否顺畅
  2. Web 上传发布是否成功落库并刷新历史
  3. 删除当前 latest 时是否自动回退到上一版
