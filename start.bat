@echo off
echo ========================================
echo   12M CRM - Запуск проекта
echo ========================================
echo.
echo Установка зависимостей backend...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
  echo Ошибка установки backend зависимостей
  pause
  exit /b 1
)

echo Синхронизация схемы БД...
call npx prisma db push
if %errorlevel% neq 0 (
  echo Ошибка синхронизации схемы БД
  pause
  exit /b 1
)

echo Генерация Prisma клиента...
call npx prisma generate
if %errorlevel% neq 0 (
  echo Ошибка генерации Prisma клиента
  pause
  exit /b 1
)

echo Заполнение БД тестовыми данными...
call npx ts-node src/seed.ts
if %errorlevel% neq 0 (
  echo Ошибка заполнения БД
  pause
  exit /b 1
)

echo.
echo Установка зависимостей frontend...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
  echo Ошибка установки frontend зависимостей
  pause
  exit /b 1
)

echo.
echo ========================================
echo  Запуск сервера и фронтенда...
echo ========================================
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Тестовый вход: director@12m.ru / admin123
echo.

start "12M CRM Backend" cmd /c "cd /d "%~dp0backend" && npm run dev"
start "12M CRM Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo Серверы запущены. Закройте окна для остановки.
pause
