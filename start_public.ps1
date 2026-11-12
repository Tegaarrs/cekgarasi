# CekGarasi - Peluncur Akses Online Publik (Cloudflare Tunnel)
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = (Get-Location).Path }
Set-Location $baseDir

Clear-Host
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "       CEKGARASI - PELUNCUR AKSES ONLINE PUBLIK        " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Pastikan build frontend produksi tersedia
$distIndex = Join-Path $baseDir "frontend\dist\index.html"
if (-not (Test-Path $distIndex)) {
    Write-Host "[1/3] Membangun bundle frontend produksi..." -ForegroundColor Yellow
    $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
    Push-Location (Join-Path $baseDir "frontend")
    & npm.cmd run build
    Pop-Location
    Write-Host "[OK] Frontend build selesai!" -ForegroundColor Green
}
else {
    Write-Host "[1/3] Build frontend siap (frontend\dist)!" -ForegroundColor Green
}

# 2. Pastikan server backend lokal aktif di port 8000
Write-Host "[2/3] Memeriksa status server backend lokal..." -ForegroundColor Yellow
$backendOk = $false
foreach ($checkUri in @("http://127.0.0.1:8000/api/health", "http://localhost:8000/api/health")) {
    try {
        $res = Invoke-WebRequest -Uri $checkUri -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($res.StatusCode -eq 200) { $backendOk = $true; break }
    } catch {}
}

if (-not $backendOk) {
    Write-Host "[INFO] Menjalankan server backend..." -ForegroundColor Yellow
    $pythonExe = Join-Path $baseDir "backend\venv\Scripts\python.exe"
    $backendDir = Join-Path $baseDir "backend"

    Start-Process -FilePath $pythonExe -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory $backendDir -WindowStyle Minimized
    Write-Host "[INFO] Menunggu server siap (memuat database & model ML)..." -ForegroundColor Cyan
    $attempts = 0
    while (-not $backendOk -and $attempts -lt 30) {
        Start-Sleep -Milliseconds 800
        $attempts++
        Write-Host -NoNewline "."
        foreach ($checkUri in @("http://127.0.0.1:8000/api/health", "http://localhost:8000/api/health")) {
            try {
                $res = Invoke-WebRequest -Uri $checkUri -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
                if ($res.StatusCode -eq 200) { $backendOk = $true; break }
            } catch {}
        }
    }
    Write-Host ""
    if ($backendOk) {
        Write-Host "[OK] Server backend aktif dan siap!" -ForegroundColor Green
    }
    else {
        Write-Host "[!] Server backend memerlukan waktu inisialisasi lebih lama." -ForegroundColor Yellow
    }
}
else {
    Write-Host "[OK] Server backend sudah aktif di port 8000!" -ForegroundColor Green
}

# 3. Cari path eksekusi cloudflared
Write-Host ""
Write-Host "[3/3] Membuka Cloudflare Tunnel HTTPS publik..." -ForegroundColor Yellow

$cloudflaredPath = Join-Path $baseDir "cloudflared.exe"
if (-not (Test-Path $cloudflaredPath)) {
    $cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
}
if (-not (Test-Path $cloudflaredPath)) {
    $cfCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cfCmd) {
        $cloudflaredPath = $cfCmd.Source
    } else {
        $cloudflaredPath = "cloudflared"
    }
}

# Gunakan temporary log file untuk menangkap URL secara aman tanpa deadlock stream
$tempLog = Join-Path $env:TEMP ("cf_tunnel_" + [System.Guid]::NewGuid().ToString("N") + ".log")

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $cloudflaredPath
$psi.Arguments = "tunnel --url http://127.0.0.1:8000 --logfile `"$tempLog`""
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$proc = [System.Diagnostics.Process]::Start($psi)
$tunnelUrl = $null
$maxSeconds = 25
$elapsed = 0

Write-Host "Menghubungkan ke jaringan publik Cloudflare (mohon tunggu sebentar)..." -ForegroundColor Gray

while (-not $tunnelUrl -and $elapsed -lt ($maxSeconds * 2) -and (-not $proc.HasExited)) {
    Start-Sleep -Milliseconds 500
    $elapsed++
    Write-Host -NoNewline "."
    if (Test-Path $tempLog) {
        try {
            $content = Get-Content -Path $tempLog -Raw -ErrorAction SilentlyContinue
            if ($content -match "(https://[a-zA-Z0-9-]+\.trycloudflare\.com)") {
                $tunnelUrl = $matches[1]
                break
            }
        } catch {}
    }
}
Write-Host ""

if ($tunnelUrl) {
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host "           LINK WEBSITE PUBLIK ANDA SIAP:              " -ForegroundColor Green
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  >>  $tunnelUrl  <<" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host "  * Akses Lokal: http://localhost:8000" -ForegroundColor Yellow
    Write-Host "  * Tautan publik aman HTTPS (dapat dibuka dari HP maupun laptop siapapun)." -ForegroundColor Cyan
    Write-Host "  * Link publik telah otomatis disalin ke Clipboard komputer." -ForegroundColor Cyan
    Write-Host "  * Browser Anda sedang dibuka otomatis ke alamat publik di atas." -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host ""

    # Salin ke clipboard
    try { Set-Clipboard -Value $tunnelUrl } catch {}

    # Buka browser otomatis
    try { Start-Process $tunnelUrl } catch {}

    Write-Host "Website publik sedang online aktif." -ForegroundColor Green
    Write-Host "Tekan CTRL + C di jendela ini jika ingin menutup tunnel publik." -ForegroundColor Yellow
    Write-Host ""

    try {
        $proc.WaitForExit()
    }
    finally {
        if (-not $proc.HasExited) {
            try { $proc.Kill() } catch {}
        }
        if (Test-Path $tempLog) {
            Remove-Item $tempLog -Force -ErrorAction SilentlyContinue
        }
    }
}
else {
    Write-Host "[!] Menjalankan cloudflared di jendela utama..." -ForegroundColor Yellow
    & $cloudflaredPath tunnel --url http://127.0.0.1:8000
}