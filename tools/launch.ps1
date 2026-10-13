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

& $cf tunnel --url http://localhost:3001
