#!/bin/bash
set -e

echo "Running npm install and build..."
cd /var/app/staging
npm install
npm run build
echo "Build completed successfully"
