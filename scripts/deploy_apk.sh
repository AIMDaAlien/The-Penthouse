#!/bin/bash

# Configuration
SERVER_IP="192.168.0.120"
SERVER_USER="root"
SERVER_PASS="ballooni121"
DEST_PATH="/mnt/Storage_Pool/penthouse/app/data/downloads/the-penthouse.apk"

# Find the latest .apk file in the current directory or arguments
APK_FILE="$1"
if [ -z "$APK_FILE" ]; then
    APK_FILE=$(ls -t *.apk 2>/dev/null | head -n 1)
fi

if [ -z "$APK_FILE" ]; then
    echo "Error: No .apk file found in current directory. Please provide path to APK."
    echo "Usage: ./deploy_apk.sh [path/to/app.apk]"
    exit 1
fi

echo "Deploying $APK_FILE to $SERVER_IP..."

# Use sshpass to scp the file
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no "$APK_FILE" "$SERVER_USER@$SERVER_IP:$DEST_PATH"

if [ $? -eq 0 ]; then
    echo "✅ deployment successful!"
    echo "Download link: http://$SERVER_IP:3000/downloads/the-penthouse.apk"
else
    echo "❌ Deployment failed."
    exit 1
fi
