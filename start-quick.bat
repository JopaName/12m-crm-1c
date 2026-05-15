@echo off
echo ========================================
echo   12M CRM - Быстрый запуск
echo ========================================
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Тестовый вход: director@12m.ru / admin123
echo.
echo Для остановки закройте окна серверов.
echo.

start "12M CRM Backend" cmd /c "cd /d "%~dp0backend" && npm run dev"
start "12M CRM Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo Запущено! Нажмите любую клавишу для выхода.
pause >nul
