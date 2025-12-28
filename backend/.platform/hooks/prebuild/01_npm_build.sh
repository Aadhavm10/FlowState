#!/bin/bash
set -e

echo "Running npm install (production mode - pre-built code)..."
cd /var/app/staging
npm install --omit=dev
echo "Dependencies installed successfully"
