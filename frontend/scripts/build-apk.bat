@echo off
REM DermaSnap APK Build Script for Windows
REM This script helps you build an APK for sharing

echo.
echo ========================================
echo   DermaSnap APK Build Script
echo ========================================
echo.

REM Check if EAS CLI is installed
where eas >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] EAS CLI not found. Installing...
    call npm install -g eas-cli
    echo [OK] EAS CLI installed
) else (
    echo [OK] EAS CLI found
)

REM Check if logged in
echo.
echo Checking Expo login status...
eas whoami >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] Not logged in. Please login:
    echo     Run: eas login
    pause
    exit /b 1
) else (
    echo [OK] Logged in to Expo
)

REM Check for .env file
echo.
if not exist .env (
    echo [X] .env file not found
    if exist .env.example (
        echo Creating .env from .env.example...
        copy .env.example .env >nul
        echo [OK] Created .env file
        echo [!] Please update EXPO_PUBLIC_BACKEND_URL in .env with your backend URL
    ) else (
        echo [X] .env.example not found. Please create .env manually
        pause
        exit /b 1
    )
) else (
    echo [OK] .env file found
)

REM Ask for build type
echo.
echo Select build type:
echo 1) Preview (APK for sharing/testing)
echo 2) Production (APK for release)
echo 3) Development (APK with dev tools)
set /p choice="Enter choice [1-3]: "

if "%choice%"=="1" (
    set PROFILE=preview
    echo Building Preview APK...
) else if "%choice%"=="2" (
    set PROFILE=production
    echo Building Production APK...
) else if "%choice%"=="3" (
    set PROFILE=development
    echo Building Development APK...
) else (
    echo Invalid choice. Using preview...
    set PROFILE=preview
)

REM Build
echo.
echo Starting build...
call eas build --platform android --profile %PROFILE%

echo.
echo [OK] Build started!
echo Monitor progress at: https://expo.dev
echo Build typically takes 10-20 minutes
echo.
echo You'll receive a notification when the build completes.
pause
