# 进度快照 026 — Flutter发布表单收敛与自动删除预览

> 日期: 2026-05-20

---

## 已完成内容

### 1. Flutter 右侧发布表单已改为主界面常驻编辑

- 不再使用弹窗编辑 `版本号` 和 `更新内容`
- 右侧面板已改为：
  - 发布统计卡片
  - `版本号` 输入框
  - `更新内容` 多行编辑区
- 按钮 `推送更新到服务器` 现在直接从主界面读取当前表单值发布

### 2. 删除清单手工输入已移除

- 已删除 Flutter 端：
  - 删除清单输入框
  - 自动归纳更新内容展示区
  - 相关控制器与旧引用
- 页面文案已同步改为：
  - `发布信息`
  - `启动器文件数`
  - `游戏文件数`
  - `自动删除数`

### 3. 自动删除预览已接入 Python bridge

- bridge 新增：
  - `preview-dual`
- Flutter 在勾选文件/目录后会调用 preview 接口，返回：
  - `launcherFileCount`
  - `gameFileCount`
  - `launcherDeletedCount`
  - `gameDeletedCount`
- 右侧统计卡片现在显示的是预览结果，而不是简单的勾选项数

### 4. publish-dual 已改为自动推导删除项

- `publish-dual` 已移除 `--delete-file`
- 发布前会自动：
  1. 读取远端当前 `latest.json`
  2. 读取上一版 `launcher/game` manifest
  3. 比较上一版文件集合与本次构建文件集合
  4. 自动生成双 scope `deleteList`
- 首版发布或远端无上一版时，自动删除为空

### 5. Flutter 发布成功后的表单体验已补齐

- 发布成功后：
  - 右侧结果卡片会显示本次双包文件数与自动删除数
  - 版本号自动跳到下一建议版本
  - 更新内容编辑区自动清空

### 6. 构建与验证已完成

- `python3 -m compileall 更新器/src/ee2x_update_suite`
- `python -m ee2x_update_suite.bridge preview-dual` 已通过
- `flutter analyze` 已通过
- `build_flutter_publish_tool.bat` 已重新打包成功
- 最新 Windows 产物仍在：
  - `更新器/dist/ee2x-flutter-publisher/ee2x_publish_tool.exe`

---

## 当前修改到的模块

- `更新器/flutter_publish_tool/lib/main.dart`
- `更新器/src/ee2x_update_suite/bridge/__main__.py`
- `更新器/src/ee2x_update_suite/publisher/service.py`
- `更新器/src/ee2x_update_suite/shared/manifest_builder.py`
- `更新器/README.md`
- `更新器/docs/发布协议.md`

---

## 待办清单

- [ ] 用真实发布配置执行一次最小范围 `publish-dual` 实推验证
- [ ] 检查自动删除策略在“只发布局部文件”时是否符合实际期望
- [ ] 如需更稳，给 Flutter 右侧增加“自动删除预览详情”查看入口
- [ ] 视需要补一次真实启动器联调，确认新发布结果与强更流程衔接正常

---

## 下一步

- 直接用 Flutter 发布端做一次真实小版本发布验证
- 优先发布少量 launcher/game 文件，确认：
  - 版本号主界面直编
  - 更新内容主界面直编
  - 自动删除预览数正确
  - 发布成功后版本号自动递增到下一建议版本
