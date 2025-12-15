# Mini Lugat

Basit, modern Türkçe sözlük uygulaması.

## Kurulum (Setup)

Bu hızlı kurulum rehberini takip ederek projeyi çalıştırabilirsiniz.

### 1. Backend (Sunucu) Kurulumu

Terminalde şu komutları çalıştırın:

```bash
cd server
npm install
npm run seed  # Veritabanını örnek kelimelerle doldurur
npm start     # Sunucuyu başlatır (Port: 3000)
```

Sunucu `http://localhost:3000` adresinde çalışacaktır.

### 2. Frontend (Arayüz) Kurulumu

Yeni bir terminal penceresi açın ve şu komutları çalıştırın:

```bash
cd client
npm install
npm run dev
```

Uygulama `http://localhost:5173` (veya benzeri) adresinde açılacaktır.

## Özellikler

- **Kelime Arama**: Türkçe karakter hassasiyeti ve hızlı arama.
- **Rastgele Kelime**: "Rastgele Getir" butonu ile yeni kelimeler keşfedin.
- **Modern Arayüz**: Sade, odaklanmış ve mobil uyumlu tasarım.

## Teknoloji

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, Vite, TailwindCSS
