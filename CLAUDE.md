# EE2 模组开发工程

## Git 排除规则

以下文件/目录已加入 `.gitignore`，**禁止推送到 GitHub**：

| 排除项 | 原因 |
|--------|------|
| `/Empire Earth II` | 游戏本体目录，体积过大 |
| `__pycache__/` | Python 缓存文件 |
| `更新器/` | 更新器项目，独立管理 |
| `backup/` | 数据库备份，体积过大 |

> 修改 `.gitignore` 后需同步调整本文档。

## 仓库信息

- 远程地址：`https://github.com/luojiang419/ee2.git`
- 主分支：`main`
- 协作者需仓库所有者在 GitHub Settings → Collaborators 中添加授权
