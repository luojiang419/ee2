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

## 自动同步规则（多机器协作）

1. **每次新会话开始时，先执行 `git pull origin main`** 拉取最新代码。因为本仓库在多台机器上同时开发，必须先同步。
2. **每次 `git commit` 后自动推送**：已配置 post-commit hook（`.git/hooks/post-commit`），commit 后自动 `git push origin main`。如果推送失败，终端会提示手动推送。
3. **修改前确保版本最新**：如果长时间未 commit，建议先 `git pull` 再开始修改。
