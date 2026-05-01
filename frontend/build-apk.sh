#!/bin/bash

# DermaSnap Local APK Build Script
# Usage: bash build-apk.sh [debug|release]

BUILD_TYPE=${1:-debug}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 DermaSnap APK Build Script"
echo "================================"
echo "Build Type: $BUILD_TYPE"
echo "Project Directory: $PROJECT_DIR"
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v20+"
    exit 1
fi

if ! command -v adb &> /dev/null; then
    echo "⚠️  ADB not found in PATH. Please add Android SDK tools to PATH"
fi

# Navigate to project
cd "$PROJECT_DIR" || exit 1

# Step 1: Install dependencies
echo ""
echo "📦 Installing Node dependencies..."
npm install

# Step 2: Prebuild if needed
if [ ! -d "android" ]; then
    echo ""
    echo "📱 Prebuild: Creating Android native folders..."
    npx expo prebuild --clean
fi

# Step 3: Navigate to android folder
cd android || exit 1

# Step 4: Clean
echo ""
echo "🧹 Cleaning previous builds..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    gradlew.bat clean
else
    ./gradlew clean
fi

# Step 5: Build APK
echo ""
echo "🔨 Building $BUILD_TYPE APK..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    if [ "$BUILD_TYPE" = "release" ]; then
        gradlew.bat assembleRelease
    else
        gradlew.bat assembleDebug
    fi
else
    if [ "$BUILD_TYPE" = "release" ]; then
        ./gradlew assembleRelease
    else
        ./gradlew assembleDebug
    fi
fi

# Step 6: Check build success
cd ..

if [ "$BUILD_TYPE" = "release" ]; then
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
else
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
fi

if [ -f "$APK_PATH" ]; then
    echo ""
    echo "✅ Build Successful!"
    echo ""
    echo "APK Location: $APK_PATH"
    echo "APK Size: $(du -h "$APK_PATH" | cut -f1)"
    echo ""
    echo "To install on device:"
    echo "  adb install $APK_PATH"
    echo ""
    echo "To launch app:"
    echo "  adb shell am start -n com.dermasnap/.MainActivity"
else
    echo ""
    echo "❌ Build Failed!"
    echo "Check the logs above for errors."
    exit 1
fi
