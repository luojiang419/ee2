# Medcar 修改日志

> 目录: `通用/11时代/医疗/Medcar/`

---

## 第1次修改 — 2026-05-21

**关联快照**: `进度快照\039-医院单位移植大学.md`
**修改类型**: 建筑归属变更

### 修改前数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HOST | Hospital | dbtechtreenode.csv |
| ROW | 2 | dbtechtreenode.csv |
| COL | 1 | dbtechtreenode.csv |

### 修改后数据
| 属性 | 值 | 来源文件 |
|:-----|:---|:--------|
| HOST | University | dbtechtreenode.csv |
| ROW | 2 | dbtechtreenode.csv |
| COL | 1 | dbtechtreenode.csv |

### 关联文件
- `EE2X_db/TechTree/dbtechtreenode.csv` — 第319行 Medcar 条目

### 修改依据
- 需求: 将医院的两种单位移植到大学生产
- 理由: 集中医疗单位生产线；图标位置(ROW=2,COL=1)在大学无冲突，保持不变

### 已知影响
- Hospital 建筑不再生产任何单位（保留治疗光环和驻军治疗功能）
- 与 SisterMona 一同迁移，大学新增两个医疗单位生产
