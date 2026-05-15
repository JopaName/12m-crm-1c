@echo off
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do set IP=%%i
set IP=%IP: =%
echo ========================================
echo   12M CRM - Быстрый запуск
echo ========================================
echo.
echo Frontend (для устройств в сети): http://%IP%:5173
echo Backend (API):                   http://localhost:3000
echo Local:                           http://localhost:5173
echo.
echo Тестовый вход: director@12m.ru / admin123
echo.

start "12M CRM Backend" cmd /c "cd /d "%~dp0backend" && npm run dev"
start "12M CRM Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo Запущено! Нажмите любую клавишу для выхода.
pause >nul
