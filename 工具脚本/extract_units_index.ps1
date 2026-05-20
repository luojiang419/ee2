# ============================================================
# EE2 单位索引自动提取脚本 v2.0
# 用法: pwsh -File extract_units_index.ps1
# 输出: 单位属性文档\全时代_E1-E15_单位索引.md
# ============================================================
$ErrorActionPreference = "Continue"
$Root = "g:\ee2\game-metadata\EE2X_db"
$CsvFile = "$Root\TechTree\upgrade_unittypes.csv"
$TechFile = "$Root\TechTree\dbtechtreenode.csv"
$UnitsDir = "$Root\Units"
$OutDir = "g:\ee2\单位属性文档"
$OutFile = "$OutDir\全时代_E1-E15_单位索引.md"

Write-Host "=== EE2 全时代单位索引提取 v2.0 ===" -ForegroundColor Cyan

# ============================================================
# 辅助函数: CSV字段解析(处理引号内逗号)
# ============================================================
function Get-CsvFields($line) {
    $fields = [System.Collections.ArrayList]::new()
    $inQuotes = $false
    $current = ""
    for ($i = 0; $i -lt $line.Length; $i++) {
        $c = $line[$i]
        if ($c -eq '"' -and -not $inQuotes) { $inQuotes = $true; continue }
        if ($c -eq '"' -and $inQuotes) { $inQuotes = $false; continue }
        if ($c -eq ',' -and -not $inQuotes) { [void]$fields.Add($current); $current = ""; continue }
        $current += $c
    }
    [void]$fields.Add($current)
    return $fields
}

# ============================================================
# 步骤1: 解析CSV提取所有升级记录
# ============================================================
Write-Host "[1/4] 解析 upgrade_unittypes.csv ..." -ForegroundColor Cyan

$allUnits = [System.Collections.ArrayList]::new()
$reader = [System.IO.StreamReader]::new($CsvFile)
$null = $reader.ReadLine()  # skip header
$csvLineNum = 1
while ($null -ne ($line = $reader.ReadLine())) {
    $csvLineNum++
    if ($line.Trim() -eq '' -or $line.StartsWith('//')) { continue }

    $f = Get-CsvFields $line
    if ($f.Count -lt 4) { continue }

    $upgrade = $f[0]
    $unitType = $f[1]
    $type = $f[2]
    $epoch = $f[3]
    $civ = if ($f.Count -ge 35) { $f[34] } else { "All" }

    # 只收录升级名中含Epoch的(真正的升级记录)
    if ($upgrade -notmatch 'UpgradeEpoch\d') { continue }

    $epNum = 0
    if ($upgrade -match 'Epoch(\d+)') { $epNum = [int]$Matches[1] }

    [void]$allUnits.Add(@{
        Upgrade  = $upgrade
        UnitType = $unitType
        Type     = $type
        Epoch    = $epNum
        CIV      = $civ
        CsvLine  = $csvLineNum
    })
}
$reader.Close()
Write-Host "  CSV解析完成: $($allUnits.Count) 条升级记录" -ForegroundColor Green

# ============================================================
# 步骤2: 构建UnitType→DDF文件映射
# ============================================================
Write-Host "[2/4] 构建 UnitType → DDF 映射 ..." -ForegroundColor Cyan

$ddfMap = @{}
$ddfFiles = Get-ChildItem $UnitsDir -Filter "*.ddf" | Where-Object {
    $_.Name -notmatch 'loew_ambient|animals|ambients|grass|test_|_bak'
}

foreach ($ddf in $ddfFiles) {
    $lines = Get-Content $ddf.FullName
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\s*UnitType\s+(\S+)') {
            $ut = $Matches[1]
            if (-not $ddfMap.ContainsKey($ut)) {
                $ddfMap[$ut] = @{ File = $ddf.Name; Line = $i + 1 }
            }
        }
    }
}
Write-Host "  DDF映射: $($ddfMap.Count) 个UnitType" -ForegroundColor Green

# ============================================================
# 步骤3: 解析科技树节点
# ============================================================
Write-Host "[3/4] 解析 dbtechtreenode.csv ..." -ForegroundColor Cyan

$techNodes = @{}
$reader2 = [System.IO.StreamReader]::new($TechFile)
$null = $reader2.ReadLine()
$techLineNum = 1
while ($null -ne ($line = $reader2.ReadLine())) {
    $techLineNum++
    if ($line.Trim() -eq '' -or $line.StartsWith('//')) { continue }

    $f = Get-CsvFields $line
    if ($f.Count -lt 4) { continue }

    $name = $f[0]
    $epoch = $f[3]
    $produce = if ($f.Count -gt 11) { $f[11] } else { "" }
    $upgrade = if ($f.Count -gt 12) { $f[12] } else { "" }
    $hostBld = if ($f.Count -gt 9) { $f[9] } else { "" }
    $ttciv = if ($f.Count -gt 22) { $f[22] } else { "" }

    $techNodes[$name] = @{
        Epoch   = $epoch
        Produce = $produce
        Upgrade = $upgrade
        HostBld = $hostBld
        TTCIV   = $ttciv
        Line    = $techLineNum
    }
}
$reader2.Close()
Write-Host "  TECH解析: $($techNodes.Count) 个节点" -ForegroundColor Green

# ============================================================
# 步骤4: 按时代分组并生成Markdown
# ============================================================
Write-Host "[4/4] 生成索引文档 ..." -ForegroundColor Cyan

$byEpoch = @{}
foreach ($u in $allUnits) {
    $ep = $u.Epoch
    if ($ep -lt 1 -or $ep -gt 15) { continue }
    if (-not $byEpoch.ContainsKey($ep)) {
        $byEpoch[$ep] = [System.Collections.ArrayList]::new()
    }
    [void]$byEpoch[$ep].Add($u)
}

# 统计每种UnitType只保留第一条(去重)
$uniqueByEpoch = @{}
foreach ($ep in ($byEpoch.Keys | Sort-Object)) {
    $seen = @{}
    $uniqueByEpoch[$ep] = [System.Collections.ArrayList]::new()
    foreach ($u in ($byEpoch[$ep] | Sort-Object UnitType)) {
        if (-not $seen.ContainsKey($u.UnitType)) {
            $seen[$u.UnitType] = $true
            [void]$uniqueByEpoch[$ep].Add($u)
        }
    }
}

# 生成Markdown
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("# EE2 全时代(E1-E15) 单位索引")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("> 自动生成: $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
[void]$sb.AppendLine("> 数据源: upgrade_unittypes.csv + dbtechtreenode.csv + Units/*.ddf")
[void]$sb.AppendLine("> 脚本: 工具脚本\extract_units_index.ps1")
[void]$sb.AppendLine("> **使用方式**: Ctrl+F 搜索 UnitType 名称即可定位")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## 源文件路径")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| 缩写 | 完整路径 |")
[void]$sb.AppendLine("|:------|:------|")
[void]$sb.AppendLine("| **CSV** | `game-metadata\EE2X_db\TechTree\upgrade_unittypes.csv` |")
[void]$sb.AppendLine("| **TECH** | `game-metadata\EE2X_db\TechTree\dbtechtreenode.csv` |")
[void]$sb.AppendLine("| **Units/** | `game-metadata\EE2X_db\Units\` |")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")

$grandTotal = 0
foreach ($ep in ($uniqueByEpoch.Keys | Sort-Object)) {
    $units = $uniqueByEpoch[$ep]
    $grandTotal += $units.Count
    $buildings = ($units | Where-Object { $_.Type -match 'Building' }).Count
    $military = $units.Count - $buildings

    [void]$sb.AppendLine("## Epoch $ep — $($units.Count) 个单位 (建筑$buildings / 军事$military)")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| UnitType | 类型 | CIV | CSV行 | DDF文件 | DDF行 | TECH行 |")
    [void]$sb.AppendLine("|:---------|:-----|:----|:------|:--------|:------|:-------|")

    foreach ($u in ($units | Sort-Object UnitType)) {
        $ut = $u.UnitType
        $ddf = if ($ddfMap.ContainsKey($ut)) { $ddfMap[$ut] } else { $null }
        $ddfFile = if ($ddf) { $ddf.File } else { "—" }
        $ddfLine = if ($ddf) { $ddf.Line.ToString() } else { "—" }

        $tech = if ($techNodes.ContainsKey($ut)) { $techNodes[$ut] } else { $null }
        $techLine = if ($tech) { $tech.Line.ToString() } else { "—" }

        [void]$sb.AppendLine("| **$ut** | $($u.Type) | $($u.CIV) | $($u.CsvLine) | $ddfFile | $ddfLine | $techLine |")
    }
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("---")
    [void]$sb.AppendLine("")
}

# 统计摘要
[void]$sb.AppendLine("## 统计摘要")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| 时代 | 去重单位数 |")
[void]$sb.AppendLine("|:-----|:----------|")
foreach ($ep in ($uniqueByEpoch.Keys | Sort-Object)) {
    [void]$sb.AppendLine("| Epoch $ep | $($uniqueByEpoch[$ep].Count) |")
}
[void]$sb.AppendLine("| **总计** | **$grandTotal** |")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("> 注: 去重 = 同一UnitType在多个升级(E11/E12/E13/E14)中只计一次")
[void]$sb.AppendLine("> DDF列为'—'表示该单位继承基础类型，无独立UnitType定义(需查通用DDF)")

# 写入文件
$sb.ToString() | Out-File -FilePath $OutFile -Encoding UTF8

Write-Host "`n===== 完成 =====" -ForegroundColor Green
Write-Host "  输出: $OutFile" -ForegroundColor Green
Write-Host "  总计: $grandTotal 个去重单位 (E1-E15)" -ForegroundColor Green
Write-Host "  DDF命中: $(($uniqueByEpoch.Values | ForEach-Object { $_ } | Where-Object { $ddfMap.ContainsKey($_.UnitType) }).Count) 个" -ForegroundColor Green
