#!/bin/bash
set -e

echo "Installing server dependencies..."
cd server
npm install

echo "Installing client dependencies..."
cd ../client
npm install

echo "Building client for production..."
npm run build

echo "Build complete!"
