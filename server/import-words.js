const fs = require('fs');
const db = require('./db');

function asciiConvert(str) {
    return str.replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'U')
        .replace(/ş/g, 's')
        .replace(/Ş/g, 'S')
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'I')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'O')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'C')
        .toLowerCase();
}

console.log('📖 Mini Lugat - CSV İçe Aktarma Scripti');
console.log('==========================================');

// Clear existing words
db.run("DELETE FROM words", [], (err) => {
    if (err) {
        console.error("❌ Mevcut kelimeler silinirken hata:", err);
        return;
    }
    console.log("✅ Mevcut kelimeler temizlendi.");

    // Read CSV file
    const csvContent = fs.readFileSync('./all_words.csv', 'utf-8');
    const lines = csvContent.split('\n');

    console.log(`📊 Toplam satır sayısı: ${lines.length}`);

    // Skip header
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    console.log(`📝 İşlenecek kelime sayısı: ${dataLines.length}`);

    let imported = 0;
    let skipped = 0;
    const batchSize = 500;
    let batch = [];

    // Prepare insert statement
    const insertStmt = db.prepare(
        "INSERT INTO words (lemma, lemma_ascii, pos, origin, definition) VALUES (?, ?, ?, ?, ?)"
    );

    function processBatch() {
        if (batch.length === 0) return;

        batch.forEach(word => {
            try {
                insertStmt.run(
                    word.lemma,
                    word.lemma_ascii,
                    word.pos || '',
                    '', // origin - CSV'de yok
                    word.definition
                );
                imported++;
            } catch (err) {
                // Duplicate or error
                skipped++;
            }
        });

        batch = [];

        // Progress update
        if (imported % 10000 === 0) {
            console.log(`⏳ İlerleme: ${imported} kelime aktarıldı...`);
        }
    }

    // Process each line
    dataLines.forEach((line, index) => {
        const parts = line.split(';');

        if (parts.length >= 3) {
            const lemma = parts[0].trim();
            const pos = parts[1].trim();
            const definition = parts[2].trim();

            if (lemma && definition) {
                const lemma_ascii = asciiConvert(lemma);

                batch.push({
                    lemma,
                    lemma_ascii,
                    pos,
                    definition
                });

                if (batch.length >= batchSize) {
                    processBatch();
                }
            }
        }
    });

    // Process remaining batch
    processBatch();

    insertStmt.finalize((err) => {
        if (err) {
            console.error("❌ Finalize hatası:", err);
        }

        console.log('\n==========================================');
        console.log('✅ İçe Aktarma Tamamlandı!');
        console.log(`📥 Aktarılan: ${imported} kelime`);
        console.log(`⏭️  Atlanan: ${skipped} kelime`);
        console.log('==========================================');

        db.close();
    });
});
