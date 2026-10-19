# CekGarasi - Public Cloudflare Tunnel Launcher
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "       CEKGARASI - PELUNCUR AKSES ONLINE PUBLIK        " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check frontend build
if (-not (Test-Path "frontend\dist\index.html")) {
    Write-Host "[1/3] Membangun bundle frontend produksi..." -ForegroundColor Yellow
    $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
    Push-Location "frontend"
    & npm run build
    Pop-Location
    Write-Host "[OK] Frontend build selesai!" -ForegroundColor Green
}
else {
    Write-Host "[1/3] Build frontend siap!" -ForegroundColor Green
}

# 2. Check backend server
Write-Host "[2/3] Memeriksa dan menyiapkan server backend..." -ForegroundColor Yellow
$backendOk = $false
try {
    $res = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -TimeoutSec 2 -UseBasicParsing
    if ($res.StatusCode -eq 200) { $backendOk = $true }
}
catch {}

if (-not $backendOk) {
    Write-Host "[INFO] Menjalankan backend server..." -ForegroundColor Yellow
    $baseDir = $PSScriptRoot
    if (-not $baseDir) { $baseDir = (Get-Location).Path }
    $pythonExe = Join-Path $baseDir "backend\venv\Scripts\python.exe"
    $backendDir = Join-Path $baseDir "backend"

    Start-Process -FilePath $pythonExe -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory $backendDir -WindowStyle Minimized
    Write-Host "[INFO] Menunggu server siap (memuat model ML K-Means)..." -ForegroundColor Cyan
    $attempts = 0
    while (-not $backendOk -and $attempts -lt 40) {
        Start-Sleep -Seconds 1
        $attempts++
        Write-Host -NoNewline "."
        try {
            $res = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -TimeoutSec 2 -UseBasicParsing
            if ($res.StatusCode -eq 200) { $backendOk = $true }
        }
        catch {}
    }
    Write-Host ""
    if ($backendOk) {
        Write-Host "[OK] Server backend aktif dan siap!" -ForegroundColor Green
    }
    else {
        Write-Host "[!] Server memerlukan waktu inisialisasi lebih lama." -ForegroundColor Yellow
    }
}
else {
    Write-Host "[OK] Server backend sudah aktif!" -ForegroundColor Green
}

# 3. Launch cloudflared and extract tunnel URL
Write-Host ""
Write-Host "[3/3] Membuka Cloudflare Tunnel HTTPS..." -ForegroundColor Yellow

$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflaredPath)) {
    $cloudflaredPath = "cloudflared"
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $cloudflaredPath
$psi.Arguments = "tunnel --url http://localhost:8000"
$psi.RedirectStandardError = $true
$psi.RedirectStandardOutput = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$proc = [System.Diagnostics.Process]::Start($psi)
$tunnelUrl = $null
$opened = $false

Write-Host "Menghubungkan ke jaringan publik Cloudflare (mohon tunggu beberapa detik)..." -ForegroundColor Gray

while (-not $proc.HasExited) {
    $line = $proc.StandardError.ReadLine()
    if ($line) {
        if ($line -match "(https://[a-zA-Z0-9-]+\.trycloudflare\.com)") {
            $tunnelUrl = $matches[1]
            break
        }
    }
}

if ($tunnelUrl) {
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host "           LINK WEBSITE PUBLIK ANDA SIAP:              " -ForegroundColor Green
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  >>  $tunnelUrl  <<" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host ""
    Write-Host "  (Link telah otomatis disalin ke Clipboard HP/Komputer)" -ForegroundColor Cyan
    Write-Host "  (Browser otomatis dibuka ke link di atas)" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host ""
    
    # Copy to clipboard
    try { Set-Clipboard -Value $tunnelUrl } catch {}
    
    # Open browser automatically
    Start-Process $tunnelUrl

    Write-Host "Tekan CTRL + C di jendela ini jika ingin menghentikan tunnel publik." -ForegroundColor Gray
    Write-Host ""
    
    # Keep reading remaining stderr so cloudflared doesn't block on buffer
    while (-not $proc.HasExited) {
        $l = $proc.StandardError.ReadLine()
        # silently drain buffer
    }
}
else {
    Write-Host "[!] Gagal mendeteksi link Cloudflare Tunnel. Menjalankan cloudflared langsung:" -ForegroundColor Red
    & "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8000
}