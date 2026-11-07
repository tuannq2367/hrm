@echo off
chcp 65001 >nul
title HRM - Hệ Thống Quản Lý Hành Chính Nhân Sự
color 0b

echo ============================================================
echo   🏢 HỆ THỐNG QUẢN LÝ HÀNH CHÍNH NHÂN SỰ (HRM)
echo   🚀 Đang khởi động hệ thống trên cổng 3030...
echo ============================================================
echo.

cd /d "%~dp0"

:: Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Máy tính chưa cài đặt Node.js!
    echo Vui lòng tải và cài đặt Node.js từ https://nodejs.org
    pause
    exit /b 1
)

:: Kiểm tra cơ sở dữ liệu dev.db
if not exist "dev.db" (
    echo [*] Cơ sở dữ liệu chưa được khởi tạo, đang tiến hành thiết lập ban đầu...
    call npx prisma db push --schema=apps/api/prisma/schema.prisma
    call npx ts-node apps/api/prisma/seed.ts
    echo [*] Thiết lập cơ sở dữ liệu ban đầu hoàn tất!
    echo.
)

:: Mở trình duyệt sau 3 giây
start "" powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3030'"

echo [*] Trình duyệt web sẽ tự động mở tại: http://localhost:3030
echo [*] Tài khoản Quản trị mặc định: 0988888888 / Admin@123
echo [*] Để tắt hệ thống: Nhấn Ctrl + C hoặc đóng cửa sổ này.
echo ============================================================
echo.

:: Chạy ứng dụng và ghi log lỗi ra logs/runtime.log
node app.js 2>&1 | powershell -Command "$input | Tee-Object -FilePath 'logs/runtime.log'"

if %errorlevel% neq 0 (
    echo.
    echo [CẢNH BÁO] Ứng dụng đã dừng với mã lỗi %errorlevel%!
    echo Toàn bộ log lỗi chi tiết đã được lưu tại: logs/error.log và logs/runtime.log
    pause
)
