@echo off
chcp 65001 >nul
title SNAKE HRM - ĐÓNG GÓI BUILD & DEPLOY HOSTING TỰ ĐỘNG
color 0A

echo ==============================================================================
echo        SNAKE HRM - BỘ CÔNG CỤ TỰ ĐỘNG BUILD & ĐÓNG GÓI DEPLOY HOSTING
echo ==============================================================================
echo.
echo Quy trình sẽ tự động thực hiện:
echo   1. Dừng các tiến trình local đang chạy để tránh khóa file
echo   2. Biên dịch thư viện Shared ^& Giao diện Web (React PWA)
echo   3. Biên dịch Backend API (NestJS) và tạo Prisma Client
echo   4. Đóng gói 2 bộ độc lập: Gói Cài đặt mới ^& Gói Update an toàn
echo   5. Tự động nén thành 2 file zip:
echo      • deploy_FULL_INSTALL.zip : Dùng cho lần đầu cài đặt mới
echo      • deploy_UPDATE_ONLY.zip  : Dùng khi cập nhật bản mới (Bảo vệ dữ liệu 100%)
echo.
echo ==============================================================================
echo Bấm phím bất kỳ để bắt đầu...
pause >nul

echo.
echo [1/5] Dừng server local đang chạy...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 >nul

echo.
echo [2/5] Đang biên dịch thư viện dùng chung ^& Web Frontend (React PWA)...
call npm run build:shared
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [LỖI] Biên dịch Shared thất bại!
    pause
    exit /b %ERRORLEVEL%
)

call npm run build:web
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [LỖI] Biên dịch Web Frontend thất bại!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/5] Đang biên dịch Backend API (NestJS + Prisma Client đa nền tảng)...
call npm run build:api
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [LỖI] Biên dịch Backend API thất bại!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [4/5] Đang đóng gói thư mục deploy_hosting và deploy_update_only...
node scripts/package-hosting.js
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [LỖI] Đóng gói hosting thất bại!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [5/5] Đang nén 2 file zip tự động...
if exist deploy_FULL_INSTALL.zip del /f /q deploy_FULL_INSTALL.zip
if exist deploy_UPDATE_ONLY.zip del /f /q deploy_UPDATE_ONLY.zip
if exist deploy_hosting.zip del /f /q deploy_hosting.zip

powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; Write-Host '• Đang nén deploy_FULL_INSTALL.zip...'; [System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path 'deploy_hosting'), (Join-Path (Get-Location) 'deploy_FULL_INSTALL.zip')); Write-Host '• Đang nén deploy_UPDATE_ONLY.zip (Bảo vệ dữ liệu)...'; [System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path 'deploy_update_only'), (Join-Path (Get-Location) 'deploy_UPDATE_ONLY.zip')); Write-Host '✅ Đã nén thành công cả 2 file zip!'"

echo.
echo ==============================================================================
echo  🎉 HOÀN THÀNH XUẤT SẮC! CÁC GÓI DEPLOY ĐÃ SẴN SÀNG!
echo ==============================================================================
echo.
echo 📁 ĐÃ TẠO 2 FILE ZIP RIÊNG BIỆT CHO BẠN:
echo.
echo  1. File "deploy_FULL_INSTALL.zip":
echo     - Dành cho LẦN ĐẦU TIÊN đưa ứng dụng lên Hosting mới.
echo     - Chứa đầy đủ: code Backend, Web PWA và cơ sở dữ liệu khởi tạo.
echo.
echo  2. File "deploy_UPDATE_ONLY.zip" (KHUYÊN DÙNG KHI CÓ BẢN MỚI):
echo     - Dành cho CÁC LẦN CẬP NHẬT TÍNH NĂNG MỚI sau này.
echo     - CHỈ CHỨA code mới (dist, client, app.js).
echo     - TUYỆT ĐỐI KHÔNG CHỨA database "dev.db" và thư mục "uploads".
echo     - Khi upload lên và Extract ghi đè, toàn bộ dữ liệu nhân sự,
echo       chấm công và bảng lương đang chạy trên server ĐƯỢC GIỮ NGUYÊN 100%!
echo.
echo ==============================================================================
echo.
echo Đang mở thư mục chứa các file zip...
explorer.exe /select,deploy_UPDATE_ONLY.zip
echo.
pause
