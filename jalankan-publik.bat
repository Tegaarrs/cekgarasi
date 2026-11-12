@echo off
cd /d "%~dp0"
title CekGarasi - Peluncur Akses Publik Online (Cloudflare Tunnel)
color 0B
echo =======================================================
echo          CEKGARASI - AKSES ONLINE PUBLIK               
echo =======================================================
echo.
echo Menjalankan proses Cloudflare Tunnel...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_public.ps1"

if %ERRORLEVEL% neq 0 (
    echo.
    echo Terjadi kendala saat menjalankan script.
    echo Mencoba menjalankan cloudflared langsung...
    if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
        "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8000
    ) else (
        cloudflared tunnel --url http://localhost:8000
    )
)

echo.
pause
