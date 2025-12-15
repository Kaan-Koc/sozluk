const fs = require('fs');
const path = require('path');
const db = require('./db');

// Usage: node bulk_import.js ./path/to/my_words.json
// JSON format expected: [{ "lemma": "...", "pos": "...", "definition": "..." }, ...]

const filePath = process.argv[2];

if (!filePath) {
    console.error('Please provide a path to the JSON file.');
    console.error('Usage: node bulk_import.js ./data.json');
    process.exit(1);
}

const absolutePath = path.resolve(filePath);

fs.readFile(absolutePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err.message);
        process.exit(1);
    }

    try {
        const words = JSON.parse(data);
        console.log(`Read ${words.length} words from file. Starting import...`);

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

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare("INSERT INTO words (lemma, lemma_ascii, pos, definition) VALUES (?, ?, ?, ?)");

            let count = 0;
            words.forEach(word => {
                const ascii = asciiConvert(word.lemma);
                // Default to empty string if pos/definition missing to avoid crash
                stmt.run(word.lemma, ascii, word.pos || '', word.definition || '');
                count++;
                if (count % 1000 === 0) console.log(`${count} words processed...`);
            });

            stmt.finalize(() => {
                db.run("COMMIT", () => {
                    console.log(`Successfully imported ${count} words.`);
                    db.close();
                });
            });
        });

    } catch (parseError) {
        console.error('Error parsing JSON:', parseError.message);
    }
});
