# ============================================================
#  华遗通商 · 一键启动（本地服务 + Cloudflare 公网隧道）
#  由「启动.bat」调用
#
#  做三件事：
#    1. 检查 cloudflared.exe 与依赖是否就绪
#    2. 在新窗口启动本地服务（端口 3001）
#    3. 等服务就绪后开启 Cloudflare 临时隧道，输出公网链接
# ============================================================

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot   # 项目根目录
Set-Location $root

function Write-Title($text) {
    Write-Host ''
    Write-Host ('=' * 62) -ForegroundColor DarkCyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ('=' * 62) -ForegroundColor DarkCyan
}

Write-Title '华遗通商 · 本地服务 + 公网隧道'

# ---------------------------------------------------------------- 前置检查
$cf = Join-Path $root 'cloudflared.exe'
if (-not (Test-Path $cf)) {
    Write-Host ''
    Write-Host '[错误] 找不到 cloudflared.exe' -ForegroundColor Red
    Write-Host '       请到 https://github.com/cloudflare/cloudflared/releases/latest'
    Write-Host '       下载 cloudflared-windows-amd64.exe，重命名为 cloudflared.exe 放到项目根目录。'
    exit 1
}

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    Write-Host ''
    Write-Host '[提示] 未发现 node_modules，正在安装依赖（首次可能需要几分钟）...' -ForegroundColor Yellow
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[错误] 依赖安装失败，请检查网络或代理设置。' -ForegroundColor Red
        exit 1
    }
}

# 端口占用检查：占用时服务窗口会因 EADDRINUSE 崩溃，先提示避免困惑
$busy = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    $proc = Get-Process -Id $busy.OwningProcess -ErrorAction SilentlyContinue
    Write-Host ''
    Write-Host "[警告] 端口 3001 已被占用（PID $($busy.OwningProcess) $($proc.ProcessName)）" -ForegroundColor Yellow
    Write-Host '       服务可能无法启动。若那是旧的演示服务，可先执行：'
    Write-Host "         Stop-Process -Id $($busy.OwningProcess) -Force" -ForegroundColor Gray
}

# ---------------------------------------------------------------- 启动服务
Write-Host ''
Write-Host '[1/2] 启动本地服务（端口 3001）...' -ForegroundColor Green

$envLine = 'set NODE_ENV=production && set COOKIE_SECURE=false && ' +
           'set SESSION_SECRET=local-demo-secret-change-me && npm run start'

Start-Process cmd -ArgumentList '/k', "chcp 65001 >nul && cd /d `"$root`" && $envLine" `
    -WindowStyle Normal | Out-Null

Write-Host '      等待服务就绪...' -ForegroundColor DarkGray

$ready = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/healthz' -TimeoutSec 2 -UseBasicParsing
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
}

if ($ready) {
    $info = $null
    try { $info = (Invoke-WebRequest -Uri 'http://127.0.0.1:3001/healthz' -TimeoutSec 3 -UseBasicParsing).Content | ConvertFrom-Json } catch { }
    Write-Host '      ✓ 本地服务已就绪：http://localhost:3001' -ForegroundColor Green
    if ($info) {
        Write-Host "        环境=$($info.env)  商品=$($info.products) 件  文章=$($info.articles) 篇" -ForegroundColor DarkGray
        Write-Host "        数据可写=$($info.dataWritable)" -ForegroundColor DarkGray
    }
} else {
    Write-Host '      [警告] 等待 30 秒仍未就绪，请查看「华遗通商-服务」窗口的报错。' -ForegroundColor Yellow
    Write-Host '             仍将尝试开启隧道...' -ForegroundColor Yellow
}

# ---------------------------------------------------------------- 开启隧道
Write-Host ''
Write-Host '[2/2] 开启 Cloudflare 公网隧道...' -ForegroundColor Green
Write-Host ''
Write-Host '  ▼▼▼ 下方出现的 https://xxxx.trycloudflare.com 就是公网链接 ▼▼▼' -ForegroundColor Yellow
Write-Host '      把它发给评委即可，自带 HTTPS。' -ForegroundColor Yellow
Write-Host '      两个窗口都保持开启；关闭本窗口链接即失效。' -ForegroundColor DarkGray
Write-Host ''

# cloudflared 把日志写到 stderr。直接调用时 PowerShell 会把每行包装成
# NativeCommandError（满屏红字），容易让人误以为启动失败。
# 这里改为重定向到临时文件再原样读出：
#   - 不再出现红色报错
#   - 输出仍然是实时的
#   - 用 .NET 读取避免中文日志被 ANSI 解码
$logFile = Join-Path $env:TEMP ("huayi-tunnel-{0}.log" -f (Get-Date -Format 'yyyyMMddHHmmss'))

# 协议选择：默认 QUIC(UDP)，但国内网络经代理时 UDP 常被干扰，
# 表现为隧道反复超时重连（日志出现 datagram manager error / timeout），
# 期间访问者会看到 Cloudflare Error 1033。改用 HTTP/2(TCP) 更稳。
# 如你的网络 UDP 正常、想追求更低延迟，可把 $useHttp2 改成 $false。
$useHttp2 = $true
$cfArgs = @('tunnel', '--url', 'http://localhost:3001')
if ($useHttp2) { $cfArgs += @('--protocol', 'http2') }

Write-Host ("      隧道协议: {0}" -f $(if ($useHttp2) { 'HTTP/2 (TCP, 抗干扰)' } else { 'QUIC (UDP, 低延迟)' })) -ForegroundColor DarkGray
Write-Host ''

# 启动一次 cloudflared，并把日志按行回显到控制台
function Start-Tunnel {
    param([string]$StdOut, [string]$StdErr)

    foreach ($f in @($StdOut, $StdErr)) {
        if (Test-Path $f) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
    }

    $p = Start-Process -FilePath $cf `
        -ArgumentList $cfArgs `
        -NoNewWindow -PassThru `
        -RedirectStandardOutput $StdOut `
        -RedirectStandardError $StdErr

    return $p
}

# 读取日志新增内容（必须共享读，否则与 cloudflared 写冲突）
function Read-NewLines {
    param([string]$File, [int]$From)

    if (-not (Test-Path $File)) { return @() }

    $text = ''
    try {
        $fs = [System.IO.File]::Open($File,
                [System.IO.FileMode]::Open,
                [System.IO.FileAccess]::Read,
                [System.IO.FileShare]::ReadWrite)
        try {
            $sr = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
            $text = $sr.ReadToEnd()
            $sr.Close()
        } finally {
            $fs.Close()
        }
    } catch {
        return @()
    }

    if (-not $text) { return @() }
    $all = $text -split "`r?`n"
    if ($From -ge $all.Count) { return @() }
    return $all[$From..($all.Count - 1)]
}

# ---------------------------------------------------------------- 主循环（含自动重连）
# 网络中断、代理切换、系统休眠都可能导致隧道进程退出。
# 这里检测到退出后自动重建，避免你半夜回来发现链接失效。
$restarts = 0
$maxRestarts = 20

try {
    while ($true) {
        $proc = Start-Tunnel -StdOut $logFile -StdErr "$logFile.err"
        $outShown = 0
        $errShown = 0

        if ($restarts -gt 0) {
            Write-Host ''
            Write-Host ("  ↻ 已自动重连隧道（第 {0} 次），新链接稍后出现在下方" -f $restarts) -ForegroundColor Yellow
            Write-Host ''
        }

        while (-not $proc.HasExited) {
            Start-Sleep -Milliseconds 400

            # 先回显 stderr（cloudflared 的日志都在这里），再回显 stdout
            $newErr = Read-NewLines -File "$logFile.err" -From $errShown
            if ($newErr.Count) {
                $errShown += $newErr.Count
                foreach ($line in $newErr) {
                    if ([string]::IsNullOrWhiteSpace($line)) { continue }
                    if ($line -match 'trycloudflare\.com') {
                        Write-Host $line -ForegroundColor Green
                    } elseif ($line -match '\bERR\b|failed|error') {
                        Write-Host $line -ForegroundColor DarkYellow
                    } else {
                        Write-Host $line -ForegroundColor DarkGray
                    }
                }
            }

            $newOut = Read-NewLines -File $logFile -From $outShown
            if ($newOut.Count) {
                $outShown += $newOut.Count
                foreach ($line in $newOut) {
                    if (-not [string]::IsNullOrWhiteSpace($line)) {
                        Write-Host $line -ForegroundColor DarkGray
                    }
                }
            }
        }

        # 进程已退出
        $restarts++
        if ($restarts -gt $maxRestarts) {
            Write-Host ''
            Write-Host ("  ✗ 隧道已连续重建 {0} 次仍失败，停止重试。" -f $maxRestarts) -ForegroundColor Red
            Write-Host '    请检查网络或代理设置，然后重新运行本脚本。' -ForegroundColor DarkGray
            break
        }

        Write-Host ''
        Write-Host '  ⚠️ 隧道连接已断开，4 秒后自动重连...' -ForegroundColor Yellow
        Start-Sleep -Seconds 4
    }
} finally {
    # 脚本被 Ctrl+C 或窗口关闭时结束隧道，避免留下孤儿进程
    if ($proc -and -not $proc.HasExited) {
        try { $proc.Kill() } catch { }
    }
    Remove-Item $logFile, "$logFile.err" -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host '隧道已结束。若要重新获取公网链接，再次运行本脚本即可。' -ForegroundColor Yellow

