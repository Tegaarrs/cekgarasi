# CekGarasi - Peluncur Server Lokal (Port 8000)
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = (Get-Location).Path }
Set-Location $baseDir

Clear-Host
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "             CEKGARASI - SERVER LOKAL                  " -ForegroundColor Cyan
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
} else {
    Write-Host "[1/3] Build frontend siap (frontend\dist)!" -ForegroundColor Green
}

# 2. Menjalankan server backend uvicorn
Write-Host "[2/3] Menyiapkan server backend di port 8000..." -ForegroundColor Yellow
$pythonExe = Join-Path $baseDir "backend\venv\Scripts\python.exe"
$backendDir = Join-Path $baseDir "backend"

# 3. Buka browser otomatis
Write-Host "[3/3] Membuka browser ke http://localhost:8000 ..." -ForegroundColor Green
Start-Process "http://localhost:8000"

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  Aplikasi CekGarasi aktif di: http://localhost:8000" -ForegroundColor Green
Write-Host "  Dokumentasi API:             http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tekan CTRL + C untuk menghentikan server." -ForegroundColor Yellow
Write-Host ""

Push-Location $backendDir
try {
    & $pythonExe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
} finally {
    Pop-Location
}
