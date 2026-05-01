@echo off
REM DermaSnap Local APK Build Script (Windows)
REM Usage: build-apk.bat [debug|release]

setlocal enabledelayedexpansion

set BUILD_TYPE=%1
if "%BUILD_TYPE%"=="" set BUILD_TYPE=debug

echo.
echo 🚀 DermaSnap APK Build Script (Windows)
echo =======================================
echo Build Type: %BUILD_TYPE%
echo Project Directory: %CD%
echo.

REM Check if Node is installed
where /q node
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js v20+
    exit /b 1
)

REM Step 1: Install dependencies
echo.
echo 📦 Installing Node dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed
    exit /b 1
)

REM Step 2: Prebuild if needed
if not exist "android" (
    echo.
    echo 📱 Prebuild: Creating Android native folders...
    call npx expo prebuild --clean
    if errorlevel 1 (
        echo ❌ Prebuild failed
        exit /b 1
    )
)

REM Step 3: Navigate to android folder
cd android
if errorlevel 1 (
    echo ❌ Failed to navigate to android folder
    exit /b 1
)

REM Step 4: Clean
echo.
echo 🧹 Cleaning previous builds...
call gradlew.bat clean
if errorlevel 1 (
    echo ❌ Gradle clean failed
    cd ..
    exit /b 1
)

REM Step 4b: Bundle JavaScript
cd ..
echo.
echo 📦 Bundling JavaScript...
call npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
if errorlevel 1 (
    echo ⚠️  JavaScript bundling had issues, continuing anyway...
)
cd android

REM Step 5: Build APK
echo.
echo 🔨 Building %BUILD_TYPE% APK...
if "%BUILD_TYPE%"=="release" (
    call gradlew.bat assembleRelease
) else (
    call gradlew.bat assembleDebug
)

if errorlevel 1 (
    echo ❌ Gradle build failed
    cd ..
    exit /b 1
)

REM Step 6: Check build success
cd ..

if "%BUILD_TYPE%"=="release" (
    set APK_PATH=android\app\build\outputs\apk\release\app-release.apk
) else (
    set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
)

if exist "%APK_PATH%" (
    echo.
    echo ✅ Build Successful!
    echo.
    echo APK Location: %APK_PATH%

    REM Get file size
    for %%A in ("%APK_PATH%") do set SIZE=%%~zA
    call :FormatSize !SIZE!
    echo APK Size: !FORMATTED_SIZE!

    echo.
    echo To install on device:
    echo   adb install %APK_PATH%
    echo.
    echo To launch app:
    echo   adb shell am start -n com.dermasnap/.MainActivity
    echo.
    echo ✨ Build completed successfully!
) else (
    echo.
    echo ❌ Build Failed!
    echo Check the logs above for errors.
    exit /b 1
)

endlocal
exit /b 0

:FormatSize
setlocal
set SIZE=%1
if %SIZE% lss 1048576 (
    set /a KB=SIZE/1024
    set FORMATTED_SIZE=!KB! KB
) else if %SIZE% lss 1073741824 (
    set /a MB=SIZE/1048576
    set FORMATTED_SIZE=!MB! MB
) else (
    set /a GB=SIZE/1073741824
    set FORMATTED_SIZE=!GB! GB
)
endlocal & set FORMATTED_SIZE=%FORMATTED_SIZE%
exit /b 0
