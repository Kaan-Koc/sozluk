import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WordDetailPage from './pages/WordDetailPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

function App() {
    return (
        <Router>
            <div className="min-h-screen flex flex-col">
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-3 text-2xl font-serif font-bold text-lugat-primary hover:text-lugat-secondary transition-colors">
                            <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
                            Mini Lugat
                        </Link>
                        <nav className="flex gap-4">
                            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-lugat-primary">Ana Sayfa</Link>
                            <Link to="/admin" className="text-sm font-medium text-gray-600 hover:text-lugat-primary">Yönetim</Link>
                        </nav>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow">
                    <div className="max-w-4xl mx-auto px-4 py-8">
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/words/:id" element={<WordDetailPage />} />
                            <Route path="/admin" element={<AdminPage />} />
                            <Route path="/login" element={<LoginPage />} />
                        </Routes>
                    </div>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-gray-200 mt-auto">
                    <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
                        &copy; 2026 Mini Lugat. Türkçe Sözlük Projesi.
                    </div>
                </footer>
            </div>
        </Router>
    );
}

export default App;
