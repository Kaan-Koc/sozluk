import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Shuffle, Clock } from 'lucide-react';
import ReactDOM from 'react-dom';

const API_URL = 'http://localhost:3000/api';

function HomePage() {
    const [words, setWords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Fetch random words on mount
    useEffect(() => {
        const fetchRandomWords = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/words?random=true&limit=10`);
                if (res.ok) {
                    const data = await res.json();
                    setWords(data.data || []);
                }
            } catch (err) {
                console.error("Failed to fetch random words:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRandomWords();
    }, []);

    const [searchResults, setSearchResults] = useState([]);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);


    const performSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setSearchLoading(true);
        setShowSearchModal(true);
        setShowSearchModal(true);

        try {
            const res = await fetch(`${API_URL}/words?search=${encodeURIComponent(searchTerm)}`);
            if (res.ok) {
                let data = await res.json();
                let results = data.data || (Array.isArray(data) ? data : []) || [];

                // Sort results: 
                // 1. Exact match (case insensitive)
                // 2. Starts with search term
                // 3. Definition length (meaningfulness)
                results.sort((a, b) => {
                    const term = searchTerm.toLowerCase();
                    const lemmaA = a.lemma.toLowerCase();
                    const lemmaB = b.lemma.toLowerCase();

                    // 1. Exact match
                    if (lemmaA === term && lemmaB !== term) return -1;
                    if (lemmaB === term && lemmaA !== term) return 1;

                    // 2. Starts with
                    const startsA = lemmaA.startsWith(term);
                    const startsB = lemmaB.startsWith(term);
                    if (startsA && !startsB) return -1;
                    if (startsB && !startsA) return 1;

                    // 3. Meaningfulness (length)
                    const lenA = a.definition ? a.definition.length : 0;
                    const lenB = b.definition ? b.definition.length : 0;
                    return lenB - lenA;
                });

                setSearchResults(results);
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleRandomWord = async () => {
        try {
            const res = await fetch(`${API_URL}/words/random`);
            if (res.ok) {
                const word = await res.json();
                navigate(`/words/${word.id}`);
            }
        } catch (err) {
            console.error("Failed to fetch random word:", err);
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* Hero / Search Section */}
            <div className="text-center space-y-6 py-10">
                <h1 className="text-4xl font-serif font-bold text-lugat-primary">
                    Kelime Ara, Keşfet.
                </h1>
                <p className="text-gray-500 max-w-lg mx-auto">
                    Türkçe'nin zengin dünyasında yolculuğa çıkın.
                </p>

                <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4 px-4">
                    <form onSubmit={performSearch} className="flex-grow flex gap-2">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lugat-secondary focus:border-transparent outline-none transition-shadow"
                                placeholder="Sözlükte ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-lugat-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            Ara
                        </button>
                    </form>
                    <button
                        onClick={handleRandomWord}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-lugat-secondary text-white font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Shuffle className="h-5 w-5" />
                        Rastgele
                    </button>
                </div>
            </div>

            {/* Default Random List (Always Visible underneath) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h2 className="text-xl font-semibold text-gray-700">
                        Rastgele Seçimler
                    </h2>
                    {/* Search History Chips - REMOVED */}
                </div>

                {loading ? (
                    <div className="text-center py-10 text-gray-500">Yükleniyor...</div>
                ) : (
                    <div className="grid gap-4">
                        {words.map((word) => (
                            <Link
                                to={`/words/${word.id}`}
                                key={word.id}
                                className="block bg-white p-5 rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition-all hover:-translate-y-0.5"
                            >
                                <div className="flex items-baseline justify-between mb-1">
                                    <h3 className="text-xl font-bold text-lugat-primary">
                                        {word.lemma}
                                    </h3>
                                    {word.pos && (
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                            {word.pos}
                                        </span>
                                    )}
                                </div>
                                <div className="text-gray-600 line-clamp-3">
                                    {word.definitions && word.definitions.length > 1 ? (
                                        <ol className="list-decimal list-inside space-y-1">
                                            {word.definitions.slice(0, 2).map((def, idx) => (
                                                <li key={idx} className="line-clamp-1">{def}</li>
                                            ))}
                                            {word.definitions.length > 2 && <li className="list-none text-xs text-gray-400">...</li>}
                                        </ol>
                                    ) : (
                                        word.definition
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Search Results Modal */}
            {showSearchModal && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-[9999] pt-20 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col relative">
                        <button
                            onClick={() => setShowSearchModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
                        >
                            <span className="text-2xl">&times;</span>
                        </button>

                        <div className="p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-800">
                                "{searchTerm}" için Arama Sonuçları
                            </h3>
                            {/* Show First Searched Word / History Context */}{/* REMOVED as per request */}
                        </div>

                        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                            {searchLoading ? (
                                <div className="text-center py-8 text-gray-500">Aranıyor...</div>
                            ) : searchResults.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Sonuç bulunamadı.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {searchResults.map((word) => (
                                        <Link
                                            to={`/words/${word.id}`}
                                            key={word.id}
                                            onClick={() => setShowSearchModal(false)}
                                            className="block bg-gray-50 p-4 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors"
                                        >
                                            <div className="font-bold text-lugat-primary text-lg">{word.lemma}</div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                {word.definitions && word.definitions.length > 1 ? (
                                                    <ol className="list-decimal list-inside">
                                                        {word.definitions.slice(0, 1).map((def, idx) => (
                                                            <li key={idx} className="truncate">{def}</li>
                                                        ))}
                                                        <li className="list-none text-xs text-indigo-400 font-medium">+{word.definitions.length - 1} diğer anlam</li>
                                                    </ol>
                                                ) : (
                                                    word.definition
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default HomePage;
