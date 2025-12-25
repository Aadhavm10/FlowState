#!/bin/bash
# Azure App Service startup script

echo "Installing yt-dlp..."
pip3 install --upgrade yt-dlp

echo "Starting Node.js application..."
node dist/index.js
