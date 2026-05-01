# Build APK Locally Without Expo - Complete Guide

## Prerequisites

### 1. Java Development Kit (JDK)
```bash
# Check if Java is installed
java -version

# Required: JDK 11 or higher
# Download from: https://www.oracle.com/java/technologies/downloads/
```

### 2. Android SDK
```bash
# Should be at:
C:\Users\varun.chaudhari.CUBEHIGHWAYS\AppData\Local\Android\Sdk

# Verify Android tools exist:
ls $ANDROID_HOME/tools
ls $ANDROID_HOME/platform-tools
ls $ANDROID_HOME/build-tools
```

### 3. Environment Variables
Set these in your system:
```bash
# Add to .bashrc or .zshrc or system environment
export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
export PATH="$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH"
```

### 4. Node.js v20+
```bash
node --version  # Should be v20+
npm --version   # Should be 10+
```

---

## Step 1: Eject from Expo to Bare React Native

Since your project uses Expo, you need to eject it:

```bash
cd frontend

# Option A: Use Expo CLI (creates android/ and ios/ folders)
npx expo prebuild --clean

# Or Option B: If prebuild fails, use:
npx expo-cli prebuild --clean --npm
```

This creates:
- `android/` directory with native Android code
- `ios/` directory with native iOS code
- Updated `package.json` with native dependencies

---

## Step 2: Install Dependencies

```bash
cd frontend

# Install Node dependencies
npm install
# or
yarn install

# Navigate to android folder
cd android

# Build gradle (one-time setup)
./gradlew clean
```

On Windows, use:
```bash
gradlew.bat clean
```

---

## Step 3: Configure Android Project

### Update `android/app/build.gradle`

```gradle
android {
    compileSdkVersion 36
    ndkVersion "27.1.12297006"
    
    defaultConfig {
        applicationId "com.dermasnap"
        minSdkVersion 24
        targetSdkVersion 36
        versionCode 1
        versionName "1.0.0"
    }
    
    signingConfigs {
        release {
            keyAlias 'dermasnap-key'
            keyPassword 'your-key-password'
            storeFile file('dermasnap-key.jks')
            storePassword 'your-store-password'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Update `android/app/src/main/AndroidManifest.xml`

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.dermasnap">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    
    <application
        android:label="@string/app_name"
        android:theme="@style/AppTheme"
        android:icon="@mipmap/ic_launcher">
        
        <activity
            android:name=".MainActivity"
            android:launchMode="singleTop"
            android:label="@string/app_name"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
            android:exported="true">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

## Step 4: Create Signing Key (One-time)

Generate a keystore file for signing the APK:

```bash
cd android/app

# Generate key (Windows)
keytool -genkey -v -keystore dermasnap-key.jks ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -alias dermasnap-key

# Or on Mac/Linux:
keytool -genkey -v -keystore dermasnap-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias dermasnap-key
```

When prompted, enter:
```
Keystore password: YourStrongPassword123!
Key password: YourStrongPassword123!
CN (First and Last Name): DermaSnap
OU (Organizational Unit): Development
O (Organization): Your Company
L (Locality): Your City
ST (State): Your State
C (Country): IN
```

Save the password - you'll need it in `build.gradle`

---

## Step 5: Build APK

### Debug APK (Development)
```bash
cd android

# Windows
gradlew.bat assembleDebug

# Mac/Linux
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (Production)
```bash
cd android

# Windows
gradlew.bat assembleRelease

# Mac/Linux
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Step 6: Install on Emulator/Device

### Install Debug APK
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Install Release APK
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Check Connected Devices
```bash
adb devices
```

---

## Step 7: Configure Backend URL for APK

### Update `.env` before building:
```
EXPO_PUBLIC_BACKEND_URL=http://187.127.149.141
```

### Rebuild:
```bash
cd frontend
npm run build:android:production
# or
cd android && gradlew.bat assembleRelease
```

---

## Complete Build Commands (Quick Reference)

```bash
# 1. Navigate to project
cd c:\Users\varun.chaudhari.CUBEHIGHWAYS\projects\DermaSnap\frontend

# 2. Install dependencies
npm install

# 3. Clean previous builds
cd android && gradlew.bat clean && cd ..

# 4. Build debug APK
cd android && gradlew.bat assembleDebug && cd ..

# 5. Install on device/emulator
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 6. Launch app
adb shell am start -n com.dermasnap/.MainActivity
```

---

## Troubleshooting

### "gradle: command not found"
```bash
# Set ANDROID_HOME
export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
export PATH="$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH"

# Verify
echo $ANDROID_HOME
```

### "JAVA_HOME not set"
```bash
# Find Java installation
where java

# Set JAVA_HOME
export JAVA_HOME="C:\Program Files\Java\jdk-20"
```

### Build fails with "SDK location not found"
Create `android/local.properties`:
```properties
sdk.dir=C:\\Users\\varun.chaudhari.CUBEHIGHWAYS\\AppData\\Local\\Android\\Sdk
ndk.dir=C:\\Users\\varun.chaudhari.CUBEHIGHWAYS\\AppData\\Local\\Android\\Sdk\\ndk\\27.1.12297006
```

### Out of memory during build
```bash
# Increase Gradle heap size
export GRADLE_OPTS="-Xmx4096m -Xms1024m"
```

### APK installation fails
```bash
# Uninstall old version first
adb uninstall com.dermasnap

# Then install
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Verify Installation

```bash
# Check if app is installed
adb shell pm list packages | grep dermasnap

# Check app info
adb shell dumpsys package com.dermasnap | grep versionName

# View logs
adb logcat | grep DermaSnap
```

---

## File Locations

After successful build:

| File | Location |
|------|----------|
| Debug APK | `frontend/android/app/build/outputs/apk/debug/app-debug.apk` |
| Release APK | `frontend/android/app/build/outputs/apk/release/app-release.apk` |
| Keystore | `frontend/android/app/dermasnap-key.jks` |
| Build Gradle | `frontend/android/app/build.gradle` |
| Manifest | `frontend/android/app/src/main/AndroidManifest.xml` |

---

## Next Steps

1. **Test on emulator** (debug APK)
2. **Test on physical device** (debug APK)
3. **Generate release APK** for Google Play
4. **Upload to Google Play Store**

---

## Google Play Store Submission

Once you have the release APK:

1. Create Google Play Developer account ($25 one-time)
2. Create app bundle: `gradlew.bat bundleRelease`
3. Sign in to Google Play Console
4. Create new app entry
5. Upload APK/AAB
6. Add app details, screenshots, description
7. Submit for review

---

## Performance Tips

- Use ProGuard/R8 for code minification (reduces APK size)
- Enable multidex if APK > 100MB
- Use WebP for images (smaller than PNG/JPEG)
- Implement lazy loading for screens

---

## References

- [React Native Android Setup](https://reactnative.dev/docs/environment-setup)
- [Android Gradle Build Guide](https://developer.android.com/build)
- [Signing Apps Guide](https://developer.android.com/studio/publish/app-signing)
- [Google Play Publishing](https://developer.android.com/studio/publish)
