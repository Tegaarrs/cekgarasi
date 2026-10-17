@echo off
cd /d "%~dp0"
title CekGarasi - Akses Publik Online (Cloudflare Tunnel)
echo =======================================================
echo          CEKGARASI - PELUNCUR AKSES PUBLIK ONLINE       
echo =======================================================
echo.

echo [1/3] Memeriksa dan menyiapkan server lokal...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$pythonPath = Join-Path '%~dp0' 'backend\venv\Scripts\python.exe'; $backendDir = Join-Path '%~dp0' 'backend'; $isActive = $false; try { $r = Invoke-WebRequest -Uri 'http://localhost:8000/api/health' -TimeoutSec 2 -UseBasicParsing; if ($r.StatusCode -eq 200) { $isActive = $true } } catch {}; if ($isActive) { Write-Host '[OK] Server lokal aktif di port 8000!' -ForegroundColor Green } else { Write-Host '[INFO] Menjalankan server backend...' -ForegroundColor Yellow; Start-Process -FilePath $pythonPath -ArgumentList '-m uvicorn app.main:app --host 0.0.0.0 --port 8000' -WorkingDirectory $backendDir -WindowStyle Minimized; Write-Host '[INFO] Menunggu server siap (memuat model ML K-Means)...' -ForegroundColor Cyan; $attempts = 0; while (-not $isActive -and $attempts -lt 40) { Start-Sleep -Seconds 1; $attempts++; Write-Host -NoNewline '.'; try { $r = Invoke-WebRequest -Uri 'http://localhost:8000/api/health' -TimeoutSec 2 -UseBasicParsing; if ($r.StatusCode -eq 200) { $isActive = $true } } catch {} }; Write-Host ''; if ($isActive) { Write-Host '[OK] Server backend berhasil aktif dan siap!' -ForegroundColor Green } else { Write-Host '[!] Server memerlukan waktu inisialisasi lebih lama.' -ForegroundColor Yellow } }"

echo.
echo [2/3] Membuka terowongan publik (Cloudflare Tunnel)...
echo       Harap tunggu beberapa detik untuk mendapatkan tautan HTTPS publik...
echo.

set "CLOUDFLARED=C:\Program Files (x86)\cloudflared\cloudflared.exe"
if not exist "%CLOUDFLARED%" (
    set "CLOUDFLARED=cloudflared"
)

"%CLOUDFLARED%" tunnel --url http://localhost:8000

pause
