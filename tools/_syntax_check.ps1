# 语法检查器：用 Windows PowerShell 5.1 解析目标脚本
# 用途：验证 launch.ps1 在 5.1 下能否正确解析（含中文与 BOM）
# 用法：powershell -NoProfile -ExecutionPolicy Bypass -File tools/_syntax_check.ps1 tools/launch.ps1

param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$full = (Resolve-Path $Path).Path
Write-Host "检查文件: $full"

# BOM 检查（5.1 读取无 BOM 的 UTF-8 会按 ANSI 解码，中文会乱码）
$bytes = [System.IO.File]::ReadAllBytes($full)
$hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
Write-Host ("  UTF-8 BOM: {0}" -f $(if ($hasBom) { '有 ✓' } else { '无 ✗（5.1 下中文会乱码）' }))

# 解析检查
$errors = $null
$tokens = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile($full, [ref]$tokens, [ref]$errors)

if ($errors.Count -eq 0) {
    Write-Host '  语法: ✓ 正确' -ForegroundColor Green
    exit 0
} else {
    Write-Host ("  语法: ✗ 发现 {0} 处错误" -f $errors.Count) -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host ("    行 {0}: {1}" -f $e.Extent.StartLineNumber, $e.Message) -ForegroundColor Red
    }
    exit 1
}
