@echo off
cd /d "%~dp0"
title CekGarasi - Akses Lokal (Localhost)
echo =======================================================
echo             CEKGARASI - PELUNCUR SERVER LOKAL          
echo =======================================================
echo.

echo [1/3] Memeriksa build frontend...
if not exist "frontend\dist\index.html" (
    echo [INFO] Build frontend belum tersedia. Membangun bundle produksi...
    set "PATH=C:\Program Files\nodejs;%PATH%"
    cd frontend
    call npm run build
    cd /d "%~dp0"
) else (
    echo [OK] Build frontend siap!
)

echo.
echo [2/3] Memeriksa dan menyiapkan server backend...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$pythonPath = Join-Path '%~dp0' 'backend\venv\Scripts\python.exe'; $backendDir = Join-Path '%~dp0' 'backend'; $isActive = $false; try { $r = Invoke-WebRequest -Uri 'http://localhost:8000/api/health' -TimeoutSec 2 -UseBasicParsing; if ($r.StatusCode -eq 200) { $isActive = $true } } catch {}; if ($isActive) { Write-Host '[OK] Server backend sudah aktif!' -ForegroundColor Green } else { Write-Host '[INFO] Menjalankan server backend...' -ForegroundColor Yellow; Start-Process -FilePath $pythonPath -ArgumentList '-m uvicorn app.main:app --host 0.0.0.0 --port 8000' -WorkingDirectory $backendDir -WindowStyle Minimized; Write-Host '[INFO] Menunggu server siap (memuat model ML K-Means)...' -ForegroundColor Cyan; $attempts = 0; while (-not $isActive -and $attempts -lt 40) { Start-Sleep -Seconds 1; $attempts++; Write-Host -NoNewline '.'; try { $r = Invoke-WebRequest -Uri 'http://localhost:8000/api/health' -TimeoutSec 2 -UseBasicParsing; if ($r.StatusCode -eq 200) { $isActive = $true } } catch {} }; Write-Host ''; if ($isActive) { Write-Host '[OK] Server backend berhasil aktif dan siap!' -ForegroundColor Green } else { Write-Host '[!] Server memerlukan waktu inisialisasi lebih lama.' -ForegroundColor Yellow } }"

echo.
echo [3/3] Membuka browser ke http://localhost:8000 ...
start http://localhost:8000

echo.
echo =======================================================
echo   Aplikasi CekGarasi aktif di: http://localhost:8000
echo   Dokumentasi API: http://localhost:8000/docs
echo =======================================================
echo.
pause
