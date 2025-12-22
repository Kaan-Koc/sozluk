# Mini Lugat

Basit, modern Türkçe sözlük uygulaması.

## 🌐 Live Demo

**Coming Soon:** Uygulama Render.com üzerinde yayına alınacak.

## Kurulum (Setup)

Bu hızlı kurulum rehberini takip ederek projeyi çalıştırabilirsiniz.

### 1. Backend (Sunucu) Kurulumu

Terminalde şu komutları çalıştırın:

```bash
cd server
npm install
npm run seed  # Veritabanını örnek kelimelerle doldurur
npm run dev   # Sunucuyu başlatır (Port: 3000)
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
- **Admin Paneli**: Kelime ekleme, düzenleme ve silme yönetimi.

## Teknoloji

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, Vite, TailwindCSS

## Deployment (Render.com)

Bu uygulama Render.com üzerinde deploy edilmek üzere yapılandırılmıştır:

1. Render.com'a giriş yapın
2. "New +" → "Web Service" seçin
3. Bu GitHub repository'yi bağlayın
4. Build Command: `bash build.sh`
5. Start Command: `cd server && npm start`
6. "Create Web Service" tıklayın

Render otomatik olarak `render.yaml` dosyasından yapılandırmayı okuyacaktır.
