# DDF与CSV安全修改规则

> 本文档记录在修改游戏数据文件时遇到的关键问题和已验证的安全修改方法，供后续开发复用，避免重复踩坑。

---

## 一、核心原则

1. **永远先备份**：每次修改前将整个数据库备份到 `backup\`
2. **最小改动范围**：每次只改目标行，绝不用全局替换
3. **改后必对比**：每次修改后与备份做 diff，确认只有目标行被改动
4. **逐文件验证**：修改多个文件时，每改一个就测试一次

---

## 二、CSV 文件修改方法

### 安全做法

使用 Edit 工具，匹配**完整行内容**进行精确替换：

```
正确示例：
old: Ch055UpgradeEpoch14,Ch055,"""Unit""",14,16000,24,1100,24,2.0,120,...
new: Ch055UpgradeEpoch14,Ch055,"""Unit""",14,15200,24,1050,24,1.9,110,...
```

### 注意事项

- CSV 行通常有 ~40 个字段，匹配时确保 old_string 在文件中唯一
- 不要只改单个数值（如 `2.0`→`1.9`），会误伤其他相同数值的行
- 数值精度保持一致（整数不用加 `.0`）

---

## 三、DDF 文件修改方法（关键！）

### 3.1 为什么DDF修改容易出错

DDF 文件有以下特点导致常规工具容易误伤：
- 使用**混合缩进**（空格和Tab混合）
- 大量**重复模式**（`NavalMove {speed = 1.7; accel = 1; angSpeed = 40}` 可能出现 40+ 次）
- 换行符是 **LF**（不是Windows的CRLF）
- 游戏引擎的DDF解析器**不兼容CRLF**，会导致 ACCESS VIOLATION 崩溃

### 3.2 唯一安全的修改方法：精确行号定位

**步骤**：

```powershell
# 1. 用 ReadAllText 读取（自动检测编码，保持原始换行符）
$file = "path\to\file.ddf"
$content = [System.IO.File]::ReadAllText($file, [System.Text.UTF8Encoding]::new($true))

# 2. 按 LF 分割成行数组
$lines = $content -split "`n"

# 3. 按精确行号修改指定行（行号从0开始）
$lines[722] = $lines[722] -replace 'speed = 1\.7', 'speed = 1.25'

# 4. 用 LF 重新拼接
$newContent = $lines -join "`n"

# 5. 写入文件（无BOM，保持原始编码）
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $newContent, $utf8NoBom)
```

**关键要点**：
- 用 `ReadAllText` 而非 `Get-Content`，避免PowerShell自动转换换行符
- 用 `` "`n" `` (LF) 分割和拼接，绝不使用 `` "`r`n" `` (CRLF)
- 用 `WriteAllText` 配合 `UTF8Encoding($false)` 写入无BOM的UTF-8
- 行号从 `diff` 输出获取，减去1即为数组索引

### 3.3 严禁的做法

| 禁止做法 | 后果 |
|:---------|:-----|
| 使用 `Set-Content` / `Out-File` 写入 | 自动转换换行符为CRLF → 游戏崩溃 |
| 使用正则 `(?s).*?` 跨行匹配 | 跨UnitType块误伤其他单位 |
| 使用 `-replace` 全局替换值（如全部 `1.7`→`1.25`） | 波及所有相同数值的单位 |
| 使用 `WriteAllLines` | 自动写入CRLF换行符 |
| 用 PowerShell `Compress-Archive` 时不做验证 | 打包后需解包验证文件编码 |

### 3.4 验证方法

每次修改后必须对比备份：

```bash
# 去除CR后对比
diff <(tr -d '\r' < backup/file.ddf) <(tr -d '\r' < current/file.ddf)
```

输出应只显示目标行的改动，不能有其他行。

同时验证换行符：
```powershell
$raw = [System.IO.File]::ReadAllBytes($file)
$cr = ($raw | Where-Object { $_ -eq 13 }).Count
# $cr 必须为 0
```

---

## 四、失败案例记录

### 案例1：PowerShell正则跨行匹配误伤（2026-05-18）

**操作**：使用 `(?s)(areaDamageRadius = 3;\}.*?NavalMove \{speed = )1\.7` 替换 Ch055 的速度

**结果**：`(?s).*?` 跨越了 UnitType 块边界，误伤了19个无关舰船的速度和LOS值

**根因**：`areaDamageRadius = 3` 虽然只在 Ch055 出现一次，但 `NavalMove {speed = 1.7` 在文件中出现44次，正则引擎的匹配范围被 `.*?` 意外扩大

**修复**：从备份恢复，改用精确行号替换

### 案例2：WriteAllLines导致CRLF → 游戏崩溃（2026-05-18）

**操作**：使用 `[System.IO.File]::WriteAllLines` 写入修改后的DDF

**结果**：文件换行符从 LF 变为 CRLF，游戏加载时报 `ACCESS VIOLATION 0x008e0aa2`

**根因**：`WriteAllLines` 在 Windows 上自动使用 `\r\n` 作为换行符，而 EE2X.exe 的DDF解析器只接受 `\n`

**修复**：改用 `ReadAllText` + `"`n"` join + `WriteAllText`

### 案例3：全局字符串替换波及无关单位（2026-05-18）

**操作**：`$content -replace 'NavalMove \{speed = 1\.6; accel = 1; angSpeed = 40\}', '...1.15...'`

**结果**：kirov 以外还有3个舰船也被改成 speed=1.15

**根因**：`speed = 1.6; accel = 1; angSpeed = 40` 在文件中出现了多次

**修复**：恢复文件，改用精确行号替换

---

## 五、修改前检查清单

- [ ] 已创建数据库备份
- [ ] 已确认目标文件的换行符格式（LF vs CRLF）
- [ ] 已确认目标行的精确行号
- [ ] 已确认 old_string 在文件中唯一出现
- [ ] 修改方法不使用全局正则替换
- [ ] 写入方式不会改变换行符
- [ ] 已准备好 diff 对比命令用于验证

---

## 六、回滚流程

当修改导致游戏崩溃且无法确定原因时：

1. 从 `backup\` 目录恢复上一个已知可用的数据库
2. 将修改分批次应用（每次只改1-2行）
3. 每批修改后启动游戏验证
4. 定位到具体哪一行导致崩溃后，分析该行的数据合法性

---

> **创建日期**: 2026-05-18
> **关联快照**: #006 阶段二海军差异化
> **适用场景**: 所有涉及 DDF/CSV 文件修改的操作
