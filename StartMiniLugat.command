#!/bin/bash

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================="
echo "   Mini Lugat - Başlatılıyor..."
echo "=========================================="

# Try to load user's shell configuration to find 'node'
# This fixes issues where node is in NVM or unusual paths
if [ -f "$HOME/.zshrc" ]; then
    source "$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    source "$HOME/.bash_profile"
fi

# Explicit check for NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Node version: $(node -v 2>/dev/null || echo 'Not Found')"
echo "NPM version:  $(npm -v 2>/dev/null || echo 'Not Found')"
echo "------------------------------------------"

if ! command -v node &> /dev/null; then
    echo "❌ HATA: Node.js bulunamadı!"
    echo "Lütfen Node.js yüklü olduğundan emin olun."
    echo "https://nodejs.org/ adresinden indirebilirsiniz."
    echo ""
    read -p "Pencereyi kapatmak için Enter'a basın..."
    exit 1
fi

# Server
echo "🚀 Backend (Sunucu) başlatılıyor..."
cd server
if [ ! -d "node_modules" ]; then
    echo "📦 Bağımlılıklar yükleniyor (Backend)..."
    npm install
fi

echo "🌱 Veritabanı hazırlanıyor..."
npm run seed

echo "Backend starting..."
npm start &
SERVER_PID=$!

# Client
echo "🚀 Frontend (Arayüz) başlatılıyor..."
cd ../client
if [ ! -d "node_modules" ]; then
    echo "📦 Bağımlılıklar yükleniyor (Frontend)..."
    npm install
fi

echo "Frontend starting..."
npm run dev &
CLIENT_PID=$!

echo ""
echo "✅ Sistem Çalışıyor!"
echo "👉 Tarayıcıda şu adresi açın: http://localhost:5173"
echo ""
echo "⚠️  Uygulamayı kapatmak için bu pencereyi kapatın."
echo "=========================================="

# Keep script running
wait $SERVER_PID $CLIENT_PID
