const db = require('./db');

const words = [
    {
        lemma: "ahenk",
        pos: "isim",
        origin: "Farsça",
        definition: "Uyum, düzen.",
        examples: [
            { sentence: "Şiirin ahengi ruhumu dinlendirdi.", author: null }
        ]
    },
    {
        lemma: "aşk",
        pos: "isim",
        origin: "Arapça",
        definition: "Şiddetli sevgi, gönül bağı.",
        examples: [
            { sentence: "Aşk, insanı deli eder.", author: "Halk Sözü" }
        ]
    },
    {
        lemma: "gönül",
        pos: "isim",
        origin: "Türkçe",
        definition: "Kalp ve iç dünya anlamında mecazî kullanılır.",
        examples: [
            { sentence: "Gönül ferman dinlemiyor.", author: null },
            { sentence: "Gönül kimi severse güzel odur.", author: null }
        ]
    },
    {
        lemma: "tevazu",
        pos: "isim",
        origin: "Arapça",
        definition: "Alçakgönüllülük.",
        examples: [
            { sentence: "Gerçek bilginlik tevazu gerektirir.", author: null }
        ]
    },
    {
        lemma: "mücadele",
        pos: "isim",
        origin: "Arapça",
        definition: "Birbirine isteklerini kabul ettirmek için iki taraf arasında yapılan zorlu çaba.",
        examples: [
            { sentence: "Hayat bir mücadeledir.", author: "Namık Kemal" }
        ]
    },
    {
        lemma: "umut",
        pos: "isim",
        origin: "Türkçe",
        definition: "Ummaktan doğan güven duygusu, ümit.",
        examples: [
            { sentence: "Umut fakirin ekmeğidir.", author: "Atasözü" }
        ]
    }
    // ... Extendable list. Keeping it short for the seed update to demonstrate structure.
];

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
    // Clear existing data cleanly to re-seed with new schema
    db.run("DELETE FROM examples");
    db.run("DELETE FROM words", (err) => {
        if (err) console.log(err.message);
        else console.log("Cleared existing words.");
    });

    const stmtWord = db.prepare("INSERT INTO words (lemma, lemma_ascii, origin, pos, definition) VALUES (?, ?, ?, ?, ?)");
    const stmtExample = db.prepare("INSERT INTO examples (word_id, sentence, author) VALUES (?, ?, ?)");

    let wordCount = 0;

    words.forEach(word => {
        const ascii = asciiConvert(word.lemma);
        stmtWord.run(word.lemma, ascii, word.origin || null, word.pos, word.definition, function (err) {
            if (err) return console.error(err.message);

            const wordId = this.lastID;
            wordCount++;

            if (word.examples && word.examples.length > 0) {
                word.examples.forEach(ex => {
                    stmtExample.run(wordId, ex.sentence, ex.author);
                });
            }
        });
    });

    // Wait briefly for async inserts (simple script logic)
    setTimeout(() => {
        stmtWord.finalize();
        stmtExample.finalize();
        console.log("Database updated with " + wordCount + " words and their examples.");
    }, 1000); // Small delay to ensure callbacks fire
});
