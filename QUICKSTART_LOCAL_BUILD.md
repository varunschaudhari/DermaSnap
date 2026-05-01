# Quick Start: Build APK Locally Without Expo

## TL;DR - 5 Minutes

### Windows Users (Recommended)
```bash
cd frontend
build-apk.bat debug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Mac/Linux Users
```bash
cd frontend
bash build-apk.sh debug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Prerequisites (One-time Setup)

### 1. Install Required Tools
```bash
# Java JDK 11+ (verify)
java -version

# Android SDK (should already have)
echo %ANDROID_HOME%
# Should output: C:\Users\varun.chaudhari.CUBEHIGHWAYS\AppData\Local\Android\Sdk

# Node.js v20+ (verify)
node --version
npm --version
```

### 2. Set Environment Variables (Windows)
Open `System Properties > Environment Variables` and add:
```
ANDROID_HOME = C:\Users\varun.chaudhari.CUBEHIGHWAYS\AppData\Local\Android\Sdk
JAVA_HOME = C:\Program Files\Java\jdk-20  (or your JDK path)
```

Add to PATH:
```
%ANDROID_HOME%\tools
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\build-tools\36.0.0
```

---

## Step 1: Prepare Project

```bash
cd c:\Users\varun.chaudhari.CUBEHIGHWAYS\projects\DermaSnap\frontend

# Install dependencies
npm install
```

---

## Step 2: Create Android Native Project

This converts your Expo project to bare React Native:

```bash
# One-time command
npx expo prebuild --clean

# This creates:
# - android/ folder with native code
# - Updates package.json with native dependencies
```

---

## Step 3: Build APK

### Debug APK (Testing)
```bash
# Windows
build-apk.bat debug

# Mac/Linux
bash build-apk.sh debug
```

**Time**: ~3-5 minutes (first build)
**Output**: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (Production)
```bash
# Windows
build-apk.bat release

# Mac/Linux
bash build-apk.sh release
```

**Time**: ~5-10 minutes
**Output**: `android/app/build/outputs/apk/release/app-release.apk`

---

## Step 4: Install on Device/Emulator

### Start Emulator (if needed)
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_8a

# Wait for boot (check with)
adb devices
```

### Install APK
```bash
# Install debug APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or release APK
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Launch App
```bash
adb shell am start -n com.dermasnap/.MainActivity

# Or view logs
adb logcat | grep DermaSnap
```

---

## Manual Steps (If Scripts Don't Work)

### Step A: Clean
```bash
cd frontend/android
gradlew.bat clean
cd ..
```

### Step B: Build Debug
```bash
cd frontend/android
gradlew.bat assembleDebug
cd ..
```

### Step C: Install
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Common Issues & Fixes

### Issue: "gradle: command not found"
**Fix**: Add to PATH or use full path:
```bash
cd frontend/android
./gradlew assembleDebug
```

### Issue: "ANDROID_HOME not set"
**Fix**: Set environment variable:
```bash
# Windows Command Prompt
set ANDROID_HOME=C:\Users\varun.chaudhari.CUBEHIGHWAYS\AppData\Local\Android\Sdk

# Windows PowerShell
$env:ANDROID_HOME="C:\Users\varun.chaudhari.CUBEHIGHWAYS\AppData\Local\Android\Sdk"
```

### Issue: "SDK location not found"
**Fix**: Create `frontend/android/local.properties`:
```properties
sdk.dir=C:\\Users\\varun.chaudhari.CUBEHIGHWAYS\\AppData\\Local\\Android\\Sdk
ndk.dir=C:\\Users\\varun.chaudhari.CUBEHIGHWAYS\\AppData\\Local\\Android\\Sdk\\ndk\\27.1.12297006
```

### Issue: "Out of memory"
**Fix**: Increase Gradle heap:
```bash
set GRADLE_OPTS=-Xmx4096m -Xms1024m
```

### Issue: APK already installed
**Fix**: Uninstall first:
```bash
adb uninstall com.dermasnap
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Verify Build

```bash
# Check APK exists
ls -la android/app/build/outputs/apk/debug/app-debug.apk

# Check APK size (should be 50-100MB)
du -h android/app/build/outputs/apk/debug/app-debug.apk

# List installed packages
adb shell pm list packages | grep dermasnap

# Check app info
adb shell dumpsys package com.dermasnap | grep versionName
```

---

## Build Configuration

### App Info
- **Package Name**: `com.dermasnap`
- **App Name**: `DermaSnap`
- **Min SDK**: 24 (Android 7.0+)
- **Target SDK**: 36 (Android 14)

### Backend URL
- **Current**: `http://187.127.149.141`
- **Location**: `frontend/.env`
- **To Change**: Edit `.env` and rebuild

---

## APK Output Locations

| Type | Path | Size | Use |
|------|------|------|-----|
| Debug | `android/app/build/outputs/apk/debug/app-debug.apk` | ~80MB | Testing |
| Release | `android/app/build/outputs/apk/release/app-release.apk` | ~60MB | Google Play |

---

## Full Build Time

| Step | Time |
|------|------|
| npm install | 2-3 min |
| Prebuild | 1-2 min |
| First gradle clean | 1 min |
| First build | 5-10 min |
| **Total (First Time)** | **~10-15 min** |
| Subsequent builds | 3-5 min |

---

## Next: Release APK for Google Play

Once you have a working debug APK:

```bash
# 1. Create signing key (one-time)
cd android/app
keytool -genkey -v -keystore dermasnap-key.jks ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -alias dermasnap-key

# 2. Update build.gradle with key details
# 3. Build release APK
cd ../..
build-apk.bat release

# 4. Verify signing
jarsigner -verify android/app/build/outputs/apk/release/app-release.apk
```

---

## Tips & Tricks

### Faster Builds
```bash
# Skip optimization checks
export GRADLE_OPTS="-Xmx4096m"

# Use daemon (faster subsequent builds)
./gradlew --daemon assembleDebug
```

### Clean Cache Between Builds
```bash
cd android
gradlew.bat clean
rm -rf node_modules/.cache
npm ci  # Instead of npm install
```

### Debug APK Directly
```bash
# Build and install in one command
cd android && gradlew.bat installDebug
```

---

## References

- **Full Guide**: `BUILD_APK_LOCALLY.md`
- **React Native Docs**: https://reactnative.dev/docs/environment-setup
- **Android Build Guide**: https://developer.android.com/build
- **Google Play Publishing**: https://developer.android.com/studio/publish

---

## Getting Help

If builds fail:
1. Check `BUILD_APK_LOCALLY.md` troubleshooting section
2. Check Gradle logs: `android/build.log`
3. Run `npm run lint` to check for code errors
4. Clear cache: `rm -rf node_modules android/build`
5. Rebuild from scratch

---

**You're ready!** Run `build-apk.bat debug` and grab your APK! 🚀
