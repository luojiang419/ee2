# 远航版工具链说明

本目录是从原 `更新器/` 工程中筛选出的远航版开发必需子集。

## 应优先使用的内容

- Python 工具链源码：
  - `更新器套件/src/ee2x_update_suite/`
- Flutter 发布端源码：
  - `Flutter发布端/flutter_publish_tool/`
- 远航版推送配置模板：
  - `更新器套件/config/publish.yuanhang.example.json`
- 协议说明：
  - `更新器套件/docs/发布协议.md`

## 注意

- `更新器套件/README.md` 是从原工程原样拷贝的历史说明，内部仍有旧的 `3010` 文案。
- 远航版实际使用时：
  - 游戏更新推送地址：`3014`
  - 安装包更新地址：`3015`
- 因此远航版开发时，应以：
  - 项目根目录 `README.md`
  - `publish.yuanhang.example.json`
  - `03-更新后端/` 下的实际源码
  为准。
