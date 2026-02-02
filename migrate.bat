@echo off
echo Initializing LuckyDraw Database...
echo.

node scripts\migrate.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Database setup complete!
    echo Run "npm run dev" to start the application
) else (
    echo.
    echo Migration failed. Check errors above.
)

pause
