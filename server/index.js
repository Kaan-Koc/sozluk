const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Seed Admin User
db.get("SELECT count(*) as count FROM users", [], (err, row) => {
    if (err) {
        console.error("Error checking users:", err);
    } else if (row.count === 0) {
        const passwordHash = bcrypt.hashSync('admin123', 10);
        db.run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", ['admin', passwordHash, 'admin'], (err) => {
            if (err) console.error("Error creating admin user:", err);
            else console.log("Default admin user created (admin/admin123)");
        });
    }
});

// AUTH ROUTES

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: "Invalid credentials" });

        // Simple token for MVP (In production use JWT)
        // We'll return a fake token that is just a base64 of the username + secret or just a simple string for now.
        // For MVP, returning the username and role is enough to store in localStorage "token" usually implies authenticity verification on subsequent requests 
        // but for this simple app we might just trust the client OR send role.
        // Let's send a dummy token structure. 
        res.json({
            token: Buffer.from(`${user.username || 'admin'}:${Date.now()}`).toString('base64'),
            username: user.username,
            role: user.role,
            message: "Login successful"
        });
    });
});

// Middleware to check auth
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        // Simple validation for MVP: Check if base64 decodes to username:timestamp
        // In a real app, verify JWT signature here via library
        const decoded = Buffer.from(token, 'base64').toString('ascii');
        const [username, timestamp] = decoded.split(':');

        if (!username || !timestamp) {
            return res.status(401).json({ error: "Invalid token structure" });
        }

        db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: "Invalid token (user not found)" });
            }
            // Attach user to request
            req.user = user;
            next();
        });
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });
    }
};

// Create User (Protected)
app.post('/api/users', authenticate, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const passwordHash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", [username, passwordHash, 'admin'], function (err) {
        if (err) return res.status(500).json({ error: "User creation failed (username might exist)" });
        res.json({ id: this.lastID, message: "User created" });
    });
});

// Helper for ASCII conversion (duplicate of seed logic, ideally shared but keep simple)
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

function processWord(word) {
    if (!word) return word;
    try {
        // Only try parsing if it looks like a JSON array
        if (word.definition && word.definition.trim().startsWith('[')) {
            const parsed = JSON.parse(word.definition);
            if (Array.isArray(parsed)) {
                word.definitions = parsed;
                // For backward compatibility (displaying first mean in simple views)
                // Use a join or just the first one? Let's use the first one for the summary property 'definition'
                // But keep 'definition' as the full string for now?
                // Actually frontend expects 'definition' to be string usually.
                // Let's replace 'definition' with parsed[0] so legacy frontend works?
                // Or kept as is but add 'definitions' array?
                // Better: keep 'definition' as the main "summary" (first item) and adds 'definitions' array.
                word.definitions = parsed;
                // Update formatted definition to be the primary one for list views
                word.definition = parsed[0];
            } else {
                word.definitions = [word.definition];
            }
        } else {
            word.definitions = [word.definition];
        }
    } catch (e) {
        // Not JSON, simple string
        word.definitions = [word.definition];
    }
    return word;
}

// 3. Random Word
app.get('/api/words/random', (req, res) => {
    // Get random word first
    db.get("SELECT * FROM words ORDER BY RANDOM() LIMIT 1", [], (err, word) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!word) {
            res.status(404).json({ error: "No words found" });
            return;
        }

        // Fetch examples for this word
        db.all("SELECT sentence, author FROM examples WHERE word_id = ?", [word.id], (err, examples) => {
            if (err) {
                // Don't fail the whole request just for examples
                word.examples = [];
            } else {
                word.examples = examples;
            }
            res.json(processWord(word));
        });
    });
});

// 2. Word Detail
app.get('/api/words/:id', (req, res) => {
    const id = req.params.id;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
    }

    const sql = "SELECT * FROM words WHERE id = ?";
    db.get(sql, [id], (err, word) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!word) {
            res.status(404).json({ error: "Word not found" });
            return;
        }

        // Fetch examples
        db.all("SELECT sentence, author FROM examples WHERE word_id = ?", [id], (err, examples) => {
            if (err) {
                word.examples = [];
            } else {
                word.examples = examples;
            }
            res.json(processWord(word));
        });
    });
});

// 7. Get Users (Admin Management)
app.get('/api/users', authenticate, (req, res) => {
    db.all("SELECT id, username, role FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 8. Delete User
app.delete('/api/users/:id', authenticate, (req, res) => {
    const id = req.params.id;

    // First check user to see if it is 'admin'
    db.get("SELECT username FROM users WHERE id = ?", [id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

        if (user.username === 'admin') {
            return res.status(403).json({ error: "Ana 'admin' hesabı silinemez." });
        }

        // Proceed to delete
        db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Kullanıcı silindi" });
        });
    });
});

// 1. List / Search / Random
app.get('/api/words', (req, res) => {
    const search = req.query.search;
    const random = req.query.random === 'true';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    if (random) {
        // Random words logic
        const countSql = "SELECT COUNT(*) as count FROM words";
        const dataSql = "SELECT * FROM words ORDER BY RANDOM() LIMIT ?";

        db.get(countSql, [], (err, countRow) => {
            if (err) return res.status(500).json({ error: err.message });
            const total = countRow.count;

            db.all(dataSql, [limit], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    data: rows.map(processWord),
                    pagination: {
                        total,
                        page: 1,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                });
            });
        });

    } else if (search) {
        const term = `%${search}%`;
        const asciiTerm = `%${asciiConvert(search)}%`;

        const countSql = `
            SELECT COUNT(*) as count FROM words 
            WHERE lemma LIKE ? 
            OR lemma_ascii LIKE ? 
        `;

        const dataSql = `
            SELECT * FROM words 
            WHERE lemma LIKE ? 
            OR lemma_ascii LIKE ? 
            ORDER BY 
                CASE WHEN lower(lemma) = lower(?) THEN 0 ELSE 1 END,
                CASE WHEN lower(lemma) LIKE ? THEN 0 ELSE 1 END,
                length(lemma) ASC
            LIMIT ? OFFSET ?
        `;

        db.get(countSql, [term, asciiTerm], (err, countRow) => {
            if (err) return res.status(500).json({ error: err.message });

            const total = countRow.count;

            // Params: (WHERE clause params) + (ORDER BY params: exact match, starts with) + (LIMIT/OFFSET)
            // exact match param: search
            // starts with param: search + '%'
            const startsWithTerm = `${search.toLowerCase()}%`;

            db.all(dataSql, [term, asciiTerm, search, startsWithTerm, limit, offset], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    data: rows.map(processWord),
                    pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                });
            });
        });


    } else {
        const countSql = "SELECT COUNT(*) as count FROM words";
        const dataSql = "SELECT * FROM words ORDER BY lemma ASC LIMIT ? OFFSET ?";

        db.get(countSql, [], (err, countRow) => {
            if (err) return res.status(500).json({ error: err.message });

            const total = countRow.count;

            db.all(dataSql, [limit, offset], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    data: rows.map(processWord),
                    pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                });
            });
        });
    }
});

// 4. Create Word
app.post('/api/words', authenticate, (req, res) => {
    const { lemma, pos, origin, definition, definitions, examples } = req.body;

    // Support both single 'definition' (legacy/simple) and 'definitions' (array)
    // We will store everything in 'definition' column as string (or JSON string)

    let finalDefinition = definition;
    if (definitions && Array.isArray(definitions) && definitions.length > 0) {
        // Filter empty strings
        const validDefs = definitions.filter(d => d && d.trim().length > 0);
        if (validDefs.length > 0) {
            finalDefinition = JSON.stringify(validDefs);
        }
    }

    if (!lemma) {
        return res.status(400).json({ error: "Kelime (Lemma) boş bırakılamaz!" });
    }
    if (!finalDefinition) {
        console.error("Validation failed:", { lemma, definitions, body: req.body });
        return res.status(400).json({ error: "En az bir tanım girmelisiniz!" });
    }

    const ascii = asciiConvert(lemma);

    // Check for duplicate
    // Check for duplicate
    db.get("SELECT id FROM words WHERE lower(lemma) = lower(?)", [lemma], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            console.log(`Duplicate found for '${lemma}':`, row);
            return res.status(409).json({ error: "Bu kelime zaten mevcut!" });
        }

        db.run(
            "INSERT INTO words (lemma, lemma_ascii, pos, origin, definition) VALUES (?, ?, ?, ?, ?)",
            [lemma, ascii, pos, origin, finalDefinition],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                const wordId = this.lastID;

                // Insert examples if any
                if (examples && Array.isArray(examples) && examples.length > 0) {
                    const stmt = db.prepare("INSERT INTO examples (word_id, sentence, author) VALUES (?, ?, ?)");
                    examples.forEach(ex => {
                        stmt.run(wordId, ex.sentence, ex.author || null);
                    });
                    stmt.finalize();
                }

                res.json({ id: wordId, message: "Word created" });
            }
        );
    });
});

// 5. Update Word
app.put('/api/words/:id', authenticate, (req, res) => {
    const id = req.params.id;
    const { lemma, pos, origin, definition, definitions, examples } = req.body;

    // Handle definitions array
    let finalDefinition = definition;
    if (definitions && Array.isArray(definitions) && definitions.length > 0) {
        const validDefs = definitions.filter(d => d && d.trim().length > 0);
        if (validDefs.length > 0) {
            finalDefinition = JSON.stringify(validDefs);
        }
    }

    if (!lemma || !finalDefinition) {
        return res.status(400).json({ error: "Lemma and definition are required" });
    }

    const ascii = asciiConvert(lemma);

    // Update Word
    const sql = `UPDATE words SET lemma = ?, lemma_ascii = ?, pos = ?, origin = ?, definition = ? WHERE id = ?`;
    db.run(sql, [lemma, ascii, pos, origin, finalDefinition, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Word not found" });

        // Update examples: Delete old, Insert new (Simple strategy)
        db.run("DELETE FROM examples WHERE word_id = ?", [id], (err) => {
            if (err) console.error("Error clearing old examples:", err);

            if (examples && Array.isArray(examples) && examples.length > 0) {
                const stmt = db.prepare("INSERT INTO examples (word_id, sentence, author) VALUES (?, ?, ?)");
                examples.forEach(ex => {
                    stmt.run(id, ex.sentence, ex.author || null);
                });
                stmt.finalize();
            }

            res.json({ message: "Word updated" });
        });
    });
});

// 6. Delete Word
app.delete('/api/words/:id', authenticate, (req, res) => {
    const id = req.params.id;

    // Cascading delete manually for SQLite (or PRAGMA foreign_keys=ON but manual is safer for MVP)
    db.run("DELETE FROM examples WHERE word_id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.run("DELETE FROM words WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "Word not found" });

            res.json({ message: "Word deleted" });
        });
    });
});

// 9. Get Synonyms (Eş Anlamlı Kelimeler)
// HİBRİT ALGORITMA: Cross-reference + Yüksek semantik benzerlik
app.get('/api/words/:id/similar', (req, res) => {
    const id = req.params.id;
    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
    }

    db.get("SELECT * FROM words WHERE id = ?", [id], (err, currentWord) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!currentWord) {
            return res.status(404).json({ error: "Word not found" });
        }

        const currentLemma = currentWord.lemma.toLowerCase();
        const currentDef = currentWord.definition.toLowerCase();

        // Strateji 1a: Tanımı TAM kelime adı olanlar (örn: "al" = "kırmızı")
        const sql1 = `
            SELECT id, lemma, pos, origin, definition 
            FROM words 
            WHERE id != ? AND LOWER(definition) = ?
            LIMIT 10
        `;

        const synonyms = [];

        db.all(sql1, [id, currentLemma], (err, exactMatches) => {
            if (exactMatches) {
                synonyms.push(...exactMatches);
            }

            // Strateji 1b: Mevcut kelime tanımı bir kelimeyse, o kelimeyi bul (örn: "irsal" = "gönderme")
            const defWords = currentDef.replace(/[^\wçğıöşü\s]/gi, '').trim().split(/\s+/);
            if (defWords.length === 1 && defWords[0].length >= 3) {
                const sql1b = `
                    SELECT id, lemma, pos, origin, definition 
                    FROM words 
                    WHERE id != ? AND LOWER(lemma) = ?
                    LIMIT 5
                `;

                db.all(sql1b, [id, defWords[0]], (err, reverseMatches) => {
                    if (reverseMatches) {
                        reverseMatches.forEach(w => {
                            if (!synonyms.find(s => s.id === w.id)) {
                                synonyms.push(w);
                            }
                        });
                    }
                    continueToStrategy2();
                });
            } else {
                continueToStrategy2();
            }
        });

        function continueToStrategy2() {

            // Strateji 2: Tanımda kelime adı geçenler (TAM KELIME olarak)
            const sql2 = `
                SELECT id, lemma, pos, origin, definition 
                FROM words 
                WHERE id != ? 
                AND LOWER(definition) LIKE '%' || ? || '%'
                LIMIT 20
            `;

            db.all(sql2, [id, currentLemma], (err, referenced) => {
                if (referenced) {
                    // Kelime sınırı kontrolü - sadece TAM kelime eşleşmeleri
                    const wordBoundaryRegex = new RegExp(`\\b${currentLemma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

                    referenced.forEach(w => {
                        const def = w.definition.toLowerCase();
                        // Sadece tam kelime eşleşmelerini al
                        if (wordBoundaryRegex.test(def) && !synonyms.find(s => s.id === w.id)) {
                            synonyms.push(w);
                        }
                    });
                }

                // Strateji 3: ÇOK yüksek semantik benzerlik (0.6+)
                const stopWords = new Set([
                    'bir', 'iki', 'üç', 'olan', 'ile', 'veya', 've', 'için',
                    'gibi', 'kadar', 'olarak', 'daha', 'çok', 'her', 'bu', 'şu',
                    'ait', 'göre', 'türlü', 'kendi', 'şey', 'olan'
                ]);

                const sql3 = `SELECT id, lemma, pos, origin, definition FROM words WHERE id != ? LIMIT 3000`;

                db.all(sql3, [id], (err, candidates) => {
                    if (!err && candidates) {
                        const currentTokens = currentDef
                            .replace(/[^\wçğıöşü\s]/gi, ' ')
                            .split(/\s+/)
                            .filter(w => w.length >= 3 && !stopWords.has(w));

                        const currentSet = new Set(currentTokens);

                        candidates.forEach(word => {
                            if (synonyms.find(s => s.id === word.id)) return;

                            const def = word.definition.toLowerCase();
                            const tokens = def
                                .replace(/[^\wçğıöşü\s]/gi, ' ')
                                .split(/\s+/)
                                .filter(w => w.length >= 3 && !stopWords.has(w));

                            const tokenSet = new Set(tokens);
                            const intersection = [...currentSet].filter(w => tokenSet.has(w)).length;
                            const union = new Set([...currentSet, ...tokenSet]).size;
                            const score = union > 0 ? intersection / union : 0;

                            // Sadece ÇOK benzer olanlar (60%+)
                            if (score >= 0.6) {
                                synonyms.push(word);
                            }
                        });
                    }

                    // Sonuçları döndür
                    const similar = synonyms
                        .slice(0, 10)
                        .map(processWord);

                    res.json({ similar });
                });
            });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
