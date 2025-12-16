import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shuffle } from 'lucide-react';

const API_URL = '/api';


function WordDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [word, setWord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [similarWords, setSimilarWords] = useState([]);
    const [loadingSimilar, setLoadingSimilar] = useState(false);

    useEffect(() => {
        const fetchWord = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_URL}/words/${id}`);
                if (!res.ok) {
                    throw new Error('Kelime bulunamadı');
                }
                const data = await res.json();
                setWord(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const fetchSimilarWords = async () => {
            setLoadingSimilar(true);
            try {
                const res = await fetch(`${API_URL}/words/${id}/similar`);
                if (res.ok) {
                    const data = await res.json();
                    setSimilarWords(data.similar || []);
                }
            } catch (err) {
                console.error('Benzer kelimeler alınamadı:', err);
            } finally {
                setLoadingSimilar(false);
            }
        };

        fetchWord();
        fetchSimilarWords();
    }, [id]);

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

    if (loading) {
        return <div className="text-center py-20 text-gray-500">Yükleniyor...</div>;
    }

    if (error || !word) {
        return (
            <div className="text-center py-20">
                <p className="text-red-500 mb-4">{error || 'Hata oluştu'}</p>
                <Link to="/" className="text-lugat-secondary font-medium hover:underline">
                    Ana Sayfaya Dön
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pt-10">
            <div className="flex justify-between items-center mb-8">
                <Link
                    to="/"
                    className="inline-flex items-center text-gray-400 hover:text-lugat-primary transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Sözlüğe Dön
                </Link>

                <button
                    onClick={handleRandomWord}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-lugat-secondary text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-sm whitespace-nowrap"
                >
                    <Shuffle className="h-4 w-4" />
                    Rastgele
                </button>
            </div>

            <article className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
                <header className="mb-8 border-b border-gray-100 pb-8">
                    <div className="flex flex-col md:flex-row md:items-baseline gap-4 mb-2">
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-lugat-primary">
                            {word.lemma}
                        </h1>
                        <div className="flex gap-2">
                            {word.pos && (
                                <span className="text-sm font-semibold uppercase tracking-wider text-lugat-secondary bg-orange-50 px-3 py-1 rounded-full">
                                    {word.pos}
                                </span>
                            )}
                            {word.origin && (
                                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    Köken: {word.origin}
                                </span>
                            )}
                        </div>
                    </div>
                </header>

                <section className="prose prose-lg text-gray-700 mb-10">
                    {word.definitions && word.definitions.length > 1 ? (
                        <ol className="list-decimal list-outside ml-6 space-y-4 marker:text-lugat-secondary marker:font-bold">
                            {word.definitions.map((def, idx) => (
                                <li key={idx} className="text-2xl leading-relaxed font-serif text-gray-800 pl-2">
                                    {def}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-2xl leading-relaxed font-serif text-gray-800">
                            {word.definition}
                        </p>
                    )}
                </section>

                {word.examples && word.examples.length > 0 && (
                    <section className="bg-gray-50 rounded-xl p-6 md:p-8 border border-gray-100 mb-10">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">
                            Örnekler
                        </h3>
                        <div className="space-y-4">
                            {word.examples.map((ex, idx) => (
                                <blockquote key={idx} className="border-l-4 border-lugat-secondary pl-4 italic text-gray-600">
                                    "{ex.sentence}"
                                    {ex.author && (
                                        <footer className="text-sm text-gray-500 mt-1 not-italic font-medium">
                                            — {ex.author}
                                        </footer>
                                    )}
                                </blockquote>
                            ))}
                        </div>
                    </section>
                )}

                {/* Synonyms Section */}
                {!loadingSimilar && similarWords.length > 0 && (
                    <section className="border-t border-gray-100 pt-8">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">
                            Eş Anlamlı Kelimeler
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {similarWords.map((similar) => (
                                <Link
                                    key={similar.id}
                                    to={`/words/${similar.id}`}
                                    className="bg-gray-50 hover:bg-lugat-secondary hover:text-white rounded-lg p-4 border border-gray-100 hover:border-lugat-secondary transition-all group"
                                >
                                    <div className="font-bold text-gray-800 group-hover:text-white mb-1">
                                        {similar.lemma}
                                    </div>
                                    {similar.pos && (
                                        <div className="text-xs text-gray-500 group-hover:text-orange-100 uppercase tracking-wide">
                                            {similar.pos}
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </article>
        </div>
    );
}

export default WordDetailPage;
