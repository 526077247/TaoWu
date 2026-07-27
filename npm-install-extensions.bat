@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ============================================
echo   Installing dependencies for all extensions
echo ============================================
echo.

set "ROOT=%~dp0"
set "COUNT=0"

for /d %%D in ("%ROOT%extensions\*") do (
    if exist "%%D\package.json" (
        set /a COUNT+=1
        echo [!COUNT!] Installing: %%~nxD
        pushd "%%D"
        call npm install
        set "ERR=!errorlevel!"
        popd
        if !ERR! neq 0 (
            echo.  [FAILED] %%~nxD ^(error code: !ERR!^)
        ) else (
            echo.  [OK] %%~nxD
        )
        echo --------------------------------------------
    )
)

if !COUNT! equ 0 (
    echo No extensions with package.json found.
) else (
    echo.
    echo Done! Processed !COUNT! extension^(s^).
)

echo.
pause
