#!/bin/bash

# DermaSnap APK Build Script
# This script helps you build an APK for sharing

echo "🚀 DermaSnap APK Build Script"
echo "=============================="
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
    echo "✅ EAS CLI installed"
else
    echo "✅ EAS CLI found"
fi

# Check if logged in
echo ""
echo "Checking Expo login status..."
if eas whoami &> /dev/null; then
    echo "✅ Logged in to Expo"
else
    echo "⚠️  Not logged in. Please login:"
    echo "   Run: eas login"
    exit 1
fi

# Check for .env file
echo ""
if [ ! -f .env ]; then
    echo "⚠️  .env file not found"
    echo "Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file"
        echo "⚠️  Please update EXPO_PUBLIC_BACKEND_URL in .env with your backend URL"
    else
        echo "❌ .env.example not found. Please create .env manually"
        exit 1
    fi
else
    echo "✅ .env file found"
fi

# Ask for build type
echo ""
echo "Select build type:"
echo "1) Preview (APK for sharing/testing)"
echo "2) Production (APK for release)"
echo "3) Development (APK with dev tools)"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        PROFILE="preview"
        echo "📦 Building Preview APK..."
        ;;
    2)
        PROFILE="production"
        echo "📦 Building Production APK..."
        ;;
    3)
        PROFILE="development"
        echo "📦 Building Development APK..."
        ;;
    *)
        echo "❌ Invalid choice. Using preview..."
        PROFILE="preview"
        ;;
esac

# Build
echo ""
echo "Starting build..."
eas build --platform android --profile $PROFILE

echo ""
echo "✅ Build started!"
echo "📊 Monitor progress at: https://expo.dev"
echo "⏱️  Build typically takes 10-20 minutes"
echo ""
echo "You'll receive a notification when the build completes."
