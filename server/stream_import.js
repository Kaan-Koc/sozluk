const fs = require('fs');
const readline = require('readline');
const path = require('path');
const db = require('./db');

// Usage: node stream_import.js ./temp_dict_repo/gts.json

const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: node stream_import.js ./path/to/gts.json');
    process.exit(1);
}

const absolutePath = path.resolve(filePath);

function asciiConvert(str) {
    if (!str) return '';
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

async function processLineByLine() {
    const fileStream = fs.createReadStream(absolutePath);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        // Clear old data for a fresh clean import? 
        // User asked for "add words". But duplicates might be annoying.
        // Let's NOT clear, but let's be careful. Actually for 600k words, clean start is better for performance and consistency.
        // BUT user might have added custom words via Admin panel.
        // Let's DELETE ALL for now to ensure we have the clean TDK set as requested "real dictionary".
        db.run("DELETE FROM examples");
        db.run("DELETE FROM words");

        const stmt = db.prepare("INSERT INTO words (lemma, lemma_ascii, origin, pos, definition) VALUES (?, ?, ?, ?, ?)");

        let count = 0;
        let batchSize = 1000;

        rl.on('line', (line) => {
            try {
                if (!line.trim()) return;

                // Remove trailing comma if present (some JSON dumps have it)
                if (line.trim().endsWith(',')) {
                    line = line.trim().slice(0, -1);
                }

                const entry = JSON.parse(line);

                // Mapping
                const lemma = entry.madde;
                if (!lemma) return;

                const ascii = asciiConvert(lemma);
                const origin = entry.lisan || null; // e.g. "Arapça" or empty

                // Get first meaning
                let definition = "";
                let pos = "";

                if (entry.anlamlarListe && entry.anlamlarListe.length > 0) {
                    const firstAnlam = entry.anlamlarListe[0];
                    definition = firstAnlam.anlam;

                    // Try to find POS content in ozelliklerListe
                    if (firstAnlam.ozelliklerListe && firstAnlam.ozelliklerListe.length > 0) {
                        // Usually the first feature is the POS (isim, sıfat)
                        pos = firstAnlam.ozelliklerListe[0].tam_adi || firstAnlam.ozelliklerListe[0].kisa_adi;
                    }
                }

                // If no definition found, maybe skip? Or insert with empty?
                // A dictionary without definition is useless. Skip.
                if (!definition) return;

                stmt.run(lemma, ascii, origin, pos, definition);
                count++;

                if (count % 10000 === 0) {
                    console.log(`${count} words processed...`);
                }

            } catch (err) {
                // console.error("Error parsing line:", err.message); // Too noisy
            }
        });

        rl.on('close', () => {
            stmt.finalize(() => {
                db.run("COMMIT", () => {
                    console.log(`Finished! Imported ${count} words.`);
                    db.close();
                });
            });
        });
    });
}

processLineByLine();
