# 数据库修改生效链路与ZIP同步规则

> 本文档记录数据修改从"工作数据库"到"游戏生效"的完整链路，以及因忽略 ZIP 同步导致修改无效的避坑经验。

---

## 一、核心问题

**修改了 `game-metadata\EE2X_db\` 中的文件，但游戏内不生效。**

这是新开发者最容易踩的坑，也是老手偶尔会遗忘的环节。

---

## 二、数据生效链路

```
工作数据库 (game-metadata\EE2X_db\)
    │
    │  修改文件后，必须重新打包到ZIP
    ▼
游戏数据ZIP (Empire Earth II\zips_ee2x\EE2X_db.zip)
    │
    │  游戏启动时从此ZIP加载全部数据
    ▼
EE2X.exe 运行时
```

**关键事实：游戏不从 `game-metadata\` 读取数据，只从 ZIP 读取。**

`game-metadata\EE2X_db\` 是开发工作目录（方便搜索、对比、版本管理），`Empire Earth II\zips_ee2x\EE2X_db.zip` 才是游戏实际加载的数据源。

---

## 三、典型症状

修改看起来完全正确——行号对、数值对、换行符对——但游戏内仍旧是旧行为：

| 场景 | 症状 |
|:-----|:-----|
| 改 DDF 属性 | 游戏内属性不变（如进驻人口仍是旧值） |
| 改 CSV 升级数值 | 单位升级后属性仍是旧值 |
| 改科技树成本 | 游戏内造价不变 |
| 改文本/名称 | 游戏内仍显示旧文本 |

**统一根因：只改了 `game-metadata\` 里的文件，没更新 ZIP。**

---

## 四、ZIP 更新方法

### 4.1 PowerShell 方法（推荐）

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "Empire Earth II\zips_ee2x\EE2X_db.zip"
$sourceFile = "game-metadata\EE2X_db\Units\某文件.ddf"
$entryPath = "EE2X_db/Units/某文件.ddf"    # ZIP 内的路径

# 1. 解压到临时目录
$tempDir = Join-Path $env:TEMP "ee2_db_update"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $tempDir)

# 2. 复制修改后的文件
$destFile = Join-Path $tempDir $entryPath
Copy-Item $sourceFile $destFile -Force

# 3. 删除原 ZIP 并重新创建
Remove-Item $zipPath -Force
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal, $false)

# 4. 清理临时目录
Remove-Item $tempDir -Recurse -Force
```

### 4.2 注意事项

- **修改 ZIP 前先备份**：`Copy-Item EE2X_db.zip EE2X_db_backup_xxx.zip`
- **ZIP 内路径必须匹配**：用 `$zip.Entries` 查看 ZIP 内完整路径再替换
- **改后立即启动游戏验证**：确认修改生效后再进行下一个修改
- **版本 ZIP 不要动**：`EE2X_db_155.zip` 等是历史版本，游戏不读它们

---

## 五、实坑案例

### 案例：提炼厂/化工厂进驻人口修改无效（2026-05-20）

**操作**：修改 `game-metadata\EE2X_db\Units\Yuanhang_720_units.ddf` 中 Oilref 和 Chemistry 的 `numOfSlots` 从 6 改为 25。DDF 修改方法正确（精确行号 + LF 保持），diff 验证通过。

**症状**：游戏正常启动无崩溃，但进驻人口仍显示 6。

**排查**：
1. DDF 文件行号正确 → 18626 和 18913 行确为 `numOfSlots = 25` ✅
2. 换行符验证通过 → CR=0 ✅
3. 游戏不崩溃 → 证明 DDF 语法正确 ✅
4. 但游戏内不生效 → **ZIP 未更新** ❌

**根因**：只修改了 `game-metadata\EE2X_db\` 中的松散文件，没有重新打包到 `Empire Earth II\zips_ee2x\EE2X_db.zip`。游戏读取的是 ZIP 中的旧文件（numOfSlots=6）。

**修复**：将修改后的 `Yuanhang_720_units.ddf` 替换到 ZIP 中，修改立即生效。

**教训**：DDF 修改正确 + 换行符安全 + 游戏不崩溃 ≠ 修改已生效。必须确认 ZIP 已更新。

---

## 六、修改后验证清单

每次修改后，按以下顺序验证：

- [ ] 1. 确认 `game-metadata\EE2X_db\` 中目标文件已修改且只有目标行变化（diff 验证）
- [ ] 2. 确认 DDF 文件换行符为 LF（CR 计数 = 0）
- [ ] 3. **确认 `Empire Earth II\zips_ee2x\EE2X_db.zip` 已更新**（ZIP 修改时间戳 / 解压抽查目标文件）
- [ ] 4. 启动游戏验证修改生效
- [ ] 5. 验证通过后提交并推送

> 第 3 步是最容易被跳过的，也是本次案例的根因。

---

## 七、与 DDF 安全规则的关系

| 问题类型 | 参考文档 |
|:---------|:---------|
| DDF 改坏了 → 游戏崩溃 | [DDF与CSV安全修改规则.md](DDF与CSV安全修改规则.md) |
| DDF 改对了但 ZIP 没更新 → 修改无效 | **本文档** |
| 两者都 OK → 修改正常生效 | 两个文档的检查清单都要过 |

---

> **创建日期**: 2026-05-20
> **关联快照**: #029 提炼厂化工厂进驻人口调整
> **适用场景**: 所有需要修改游戏数据的操作
