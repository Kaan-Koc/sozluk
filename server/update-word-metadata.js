const sqlite3 = require('sqlite3').verbose();
const https = require('https');

const db = new sqlite3.Database('./dictionary.db', (err) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err.message);
        process.exit(1);
    }
    console.log('✅ Veritabanına bağlanıldı.');
    // Performans için WAL modu ve senkronizasyon ayarı
    db.run("PRAGMA journal_mode = WAL;");
    db.run("PRAGMA synchronous = NORMAL;");
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 100,
    timeout: 10000
});

// TDK API'den kelime bilgilerini çek
function fetchFromTDK(word) {
    return new Promise((resolve, reject) => {
        const url = `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(word)}`;

        const options = {
            agent: httpsAgent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };

        const req = https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && Array.isArray(json) && json.length > 0 && json[0].anlamlarListe) {
                        const firstEntry = json[0];
                        const firstMeaning = firstEntry.anlamlarListe[0];

                        // Kelime türünü al
                        let pos = null;
                        if (firstMeaning.ozelliklerListe) {
                            const posObj = firstMeaning.ozelliklerListe.find(o => o.tur === '3'); // 3 = isim, sıfat vb türler
                            if (posObj) pos = posObj.tam_adi;
                        }

                        // Kökeni al
                        let origin = null;
                        if (firstEntry.lisan) {
                            origin = firstEntry.lisan;
                        }

                        resolve({ id: null, pos, origin, found: true });
                    } else {
                        resolve({ id: null, pos: null, origin: null, found: false });
                    }
                } catch (e) {
                    resolve({ id: null, found: false, error: e.message });
                }
            });
        });

        req.on('error', (err) => {
            resolve({ id: null, found: false, error: err.message });
        });

        // Timeout
        req.setTimeout(8000, () => {
            req.destroy();
            resolve({ id: null, found: false, error: "Timeout" });
        });
    });
}

// Ana işlem
async function updateWordMetadata() {
    return new Promise((resolve, reject) => {
        // Önce eksik bilgili kelimeleri çek
        const query = `
            SELECT id, lemma, pos, origin
            FROM words
            WHERE (pos IS NULL OR pos = '' OR origin IS NULL OR origin = '')
            ORDER BY id ASC
        `;

        db.all(query, [], async (err, words) => {
            if (err) {
                console.error('Kelimeler çekilemedi:', err.message);
                reject(err);
                return;
            }

            const totalWords = words.length;
            console.log(`\n📊 Toplam ${totalWords} kelime güncellenecek.\n`);

            let completed = 0;
            let updatedCount = 0;
            let notFoundCount = 0;

            // SUPER TURBO MODE
            const CONCURRENCY_LIMIT = 100; // 100 paralel istek
            const BATCH_SIZE = 500; // Daha büyük batch

            let activeWorkers = 0;
            let currentIndex = 0;
            const updatesBuffer = [];

            // İlerleme çubuğu güncelleme
            const printProgress = () => {
                const percent = ((completed / totalWords) * 100).toFixed(1);
                process.stdout.write(`\r🔥 SUPER TURBO: ${completed}/${totalWords} (%${percent}) | Güncellenen: ${updatedCount} | Aktif: ${activeWorkers}   `);
            };

            // Veritabanına toplu yazma fonksiyonu
            const flushBuffer = async () => {
                if (updatesBuffer.length === 0) return;

                const bufferCopy = [...updatesBuffer];
                updatesBuffer.length = 0; // Buffer'ı boşalt

                return new Promise((res, rej) => {
                    db.serialize(() => {
                        db.run("BEGIN TRANSACTION");
                        const stmt = db.prepare("UPDATE words SET pos = ?, origin = ? WHERE id = ?");

                        bufferCopy.forEach(item => {
                            stmt.run(item.pos, item.origin, item.id);
                        });

                        stmt.finalize();
                        db.run("COMMIT", (err) => {
                            if (err) console.error("Transaction error:", err);
                            res();
                        });
                    });
                });
            };

            // Worker döngüsü
            const next = () => {
                if (currentIndex >= words.length) {
                    if (activeWorkers === 0) {
                        // Bitti
                        flushBuffer().then(() => {
                            console.log(`\n\n✅ İşlem tamamlandı!`);
                            console.log(`📈 Toplam Güncellenen: ${updatedCount}`);

                            db.close(() => resolve());
                        });
                    }
                    return;
                }

                const word = words[currentIndex++];
                activeWorkers++;

                fetchFromTDK(word.lemma).then(result => {
                    completed++;
                    activeWorkers--;

                    if (result.found && (result.pos || result.origin)) {
                        // Mevcut değerleri koru, yenileri ekle
                        const newPos = (!word.pos || word.pos === '') ? result.pos : word.pos;
                        const newOrigin = (!word.origin || word.origin === '') ? result.origin : word.origin;

                        updatesBuffer.push({
                            id: word.id,
                            pos: newPos,
                            origin: newOrigin
                        });
                        updatedCount++;
                    } else {
                        notFoundCount++;
                    }

                    // Buffer dolduysa yaz
                    if (updatesBuffer.length >= BATCH_SIZE) {
                        flushBuffer(); // Async ama beklemiyoruz, devam ediyoruz
                    }

                    if (completed % 10 === 0) printProgress();

                    // Hemen yenisini al
                    next();
                }).catch(() => {
                    activeWorkers--;
                    completed++;
                    next();
                });
            };

            // İlk worker grubunu başlat
            for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
                next();
            }
        });
    });
}

// Scripti çalıştır
console.log('🚀 Turbo mod başlatılıyor (30x Hız)...');
updateWordMetadata().catch(err => {
    console.error('❌ Fatal hata:', err);
    process.exit(1);
});
