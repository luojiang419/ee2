# 备份索引

> 最后更新: 2026-05-21 11:45
> 格式规则: 备份一律使用 `.zip` 压缩包，禁止裸目录。ZIP 文件和本索引纳入 Git 版本管理。
> 不可推送的备份：超大（>100MB）、全量基线（含游戏本体）、启动器/Flutter 构建产物 — 仅保留本地。

---

## ZIP 备份包（纳入 Git，已推送 GitHub）

### 游戏数据库备份

| 序号 | 备份包 | 大小 | 内容摘要 |
|:-----|:------|:-----|:--------|
| 001 | EE2X_db-001-stage1-pre.zip | 1.0 MB | 阶段一海军调优前置 |
| 002 | EE2X_db-002-phase2-pre.zip | 1.0 MB | 阶段二海军差异化前置 |
| 003 | EE2X_db-003-army-diff-pre.zip | 0.1 MB | 陆军差异化前置 |
| 004 | EE2X_db-004-E11-all-pre.zip | 1.0 MB | E11全局调优前置 |
| 005 | EE2X_db-005-E14-air-pre.zip | 1.0 MB | E14空军调优前置 |
| 006 | EE2X_db-006-frigate-AAM-pre.zip | <0.1 MB | 护卫舰防空弹药前置 |
| 007 | EE2X_db-007-dapao14-pre.zip | 0.1 MB | E14火炮阵地属性修改前置 |
| 008 | EE2X_db-008-super-battleship-pre.zip | 1.0 MB | 超级主力舰三倍化前置 |
| 013 | EE2X_db-013-refinery-chem-garrison-pre.zip | <0.1 MB | 提炼厂化工厂进驻人口前置 |
| 014 | EE2X_db-014-e14-fighter-rebalance-pre.zip | 1.0 MB | E14战斗机重平衡前置 |
| 016 | EE2X_db-016-sam-attack-progression-pre.zip | 1.0 MB | 萨姆防空导弹攻击力递增前置 |
| 017 | EE2X_db-017-sam-salvo-3missile-pre.zip | 1.0 MB | 萨姆三轮齐射前置 |

### 更新器/Flutter 备份（可推送部分）

| 序号 | 备份包 | 大小 | 内容摘要 |
|:-----|:------|:-----|:--------|
| 008 | EE2X_db-008-updater-redesign-pre.zip | 35.3 MB | 更新器重构前置 |
| 009 | EE2X_db-009-updater-packaging-pre.zip | 35.3 MB | 更新器打包前置 |
| 011 | EE2X_db-011-flutter-history-pre.zip | 69.3 MB | Flutter版本历史前置 |
| 020 | EE2X_db-020-launcher-update-fix-pre.zip | 75.8 MB | 启动器更新修复前置 |
| 021 | EE2X_db-021-baseline-1.0.0-pre-quick.zip | 61.4 MB | 1.0.0基线快速备份 |

### 全量数据库快照

| 备份包 | 大小 | 内容摘要 |
|:------|:-----|:--------|
| EE2X_db_original_20260518-1943.zip | 1.6 MB | 原始数据库全量备份 (548 entries) |
| EE2X_db_backup_20260521_111948.zip | 1.7 MB | dapao E14火箭弹修改前数据库全量 (506 entries) |

---

## 仅本地保留（不推送 GitHub）

### 超大备份（>100MB，GitHub 拒绝）

| 原目录 | 估计大小 | 说明 |
|:------|:--------|:-----|
| EE2X_db-010-flutter-dual-package-pre/ | 158 MB | Flutter双包发布（含构建产物） |
| EE2X_db-012-new-update-backend-pre/ | 453 MB | 新更新后端（含Flutter引擎） |
| EE2X_db-015-update-release-chain-pre/ | 479 MB | 更新发布链路 |
| EE2X_db-017-publisher-bridge-sidecar-pre/ | 445 MB | 发布端bridge侧车 |
| EE2X_db-018-launcher-safe-publish-pre/ | 561 MB | 启动器安全发布 |
| EE2X_db-019-streaming-upload-pre/ | 833 MB | 流式上传 |

### 全量基线（含游戏本体，禁止推送）

| 原目录 | 估计大小 | 说明 |
|:------|:--------|:-----|
| EE2X_db-021-baseline-1.0.0-pre/ | 8,916 MB (已删) | 完整游戏+启动器全量基线 |

### 安装器

| 文件 | 大小 | 说明 |
|:------|:-----|:-----|
| up16_installer.exe | 1.5 GB | UP1.6 安装器（已推送制品） |

### 空占位目录

| 目录 | 说明 |
|:------|:-----|
| 001/ | 空目录 |

---

> ZIP 总数: 19 个（17 个 EE2X_db-* + 2 个全量快照）。其中 12 个游戏数据备份 + 5 个更新器备份 + 2 个全量快照。
