@echo off
chcp 65001 >nul
title HRM - Quản Lý Lỗi Hệ Thống
color 0e

cd /d "%~dp0"

echo ============================================================
echo   🔍 CÔNG CỤ THEO DÕI VÀ QUẢN LÝ LỖI HỆ THỐNG (HRM)
echo ============================================================
echo.

node scripts/manage-errors.js list OPEN

echo.
echo ============================================================
echo Tùy chọn:
echo  1. Xem chi tiết một mã lỗi
echo  2. Đánh dấu một mã lỗi đã xử lý xong (RESOLVED)
echo  3. Xem toàn bộ lỗi (cả OPEN và RESOLVED)
echo  4. Thoát
echo ============================================================
set /p opt="Chọn thao tác (1-4): "

if "%opt%"=="1" (
    set /p code="Nhập Mã Lỗi (VD: ERR-xxxxx): "
    node scripts/manage-errors.js detail %code%
    pause
)
if "%opt%"=="2" (
    set /p code="Nhập Mã Lỗi cần chuyển Resolved: "
    set /p note="Nhập ghi chú cách khắc phục: "
    node scripts/manage-errors.js resolve %code% %note%
    pause
)
if "%opt%"=="3" (
    node scripts/manage-errors.js list ALL
    pause
)
