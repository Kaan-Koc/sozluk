import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';

function AdminPage() {
    const navigate = useNavigate();
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [tempError, setTempError] = useState(null); // State for temporary warnings
    const [toast, setToast] = useState({ show: false, message: '', type: '' }); // Toast notification

    // Form state
    const [formData, setFormData] = useState({
        lemma: '',
        origin: '',
        pos: 'isim',
        definitions: [''], // Changed from single definition string to array
        examples: [{ sentence: '', author: '' }]
    });

    const [showAllModal, setShowAllModal] = useState(false);
    const [allWords, setAllWords] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [modalLoading, setModalLoading] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [modalSearchTerm, setModalSearchTerm] = useState('');

    // User management state
    const [showUserForm, setShowUserForm] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '' });
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchWords();
    }, [navigate]);

    // Auto-dismiss toast after 3 seconds
    useEffect(() => {
        if (toast.show) {
            const timer = setTimeout(() => {
                setToast({ show: false, message: '', type: '' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.show]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch('http://localhost:3000/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Toggle user form and fetch users if opening
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [deleteWordConfirmId, setDeleteWordConfirmId] = useState(null);

    const toggleUserForm = () => {
        const newState = !showUserForm;
        setShowUserForm(newState);
        if (newState) {
            fetchUsers();
        }
    };

    const confirmDeleteUser = async (id) => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`http://localhost:3000/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            fetchUsers();
            setDeleteConfirmId(null);
        } catch (err) {
            alert(err.message);
            setDeleteConfirmId(null);
        }
    };

    // Main fetch for the Admin Page table (default limit 50, page 1 or search)
    const fetchWords = async (query = '') => {
        setLoading(true);
        try {
            const url = query
                ? `http://localhost:3000/api/words?search=${encodeURIComponent(query)}&limit=50`
                : 'http://localhost:3000/api/words?limit=50';

            const response = await fetch(url);
            if (!response.ok) throw new Error('Kelimeler alınamadı');
            const result = await response.json();

            // Handle new response format { data, pagination }
            if (result.data) {
                setWords(result.data);
            } else {
                // Fallback for array response if server reverted
                setWords(result);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch for the Modal (Pagination)
    const fetchAllWords = async (pageNum = 1, query = '') => {
        setModalLoading(true);
        try {
            const url = query
                ? `http://localhost:3000/api/words?page=${pageNum}&limit=50&search=${encodeURIComponent(query)}`
                : `http://localhost:3000/api/words?page=${pageNum}&limit=50`;

            const response = await fetch(url);
            const result = await response.json();

            if (result.data) {
                setAllWords(result.data);
                setTotalPages(result.pagination.totalPages);
                setPage(pageNum);
            }
        } catch (err) {
            alert("Liste alınamadı: " + err.message);
        } finally {
            setModalLoading(false);
        }
    };

    const openAllWordsModal = () => {
        setShowAllModal(true);
        setModalSearchTerm(''); // Reset modal search when opening
        fetchAllWords(1, '');
    };

    const handleModalSearch = (e) => {
        e.preventDefault();
        fetchAllWords(1, modalSearchTerm);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchWords(searchTerm);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleExampleChange = (index, field, value) => {
        const newExamples = [...formData.examples];
        newExamples[index][field] = value;
        setFormData(prev => ({
            ...prev,
            examples: newExamples
        }));
    };

    const addExample = () => {
        setFormData(prev => ({
            ...prev,
            examples: [...prev.examples, { sentence: '', author: '' }]
        }));
    };

    const handleDefinitionChange = (index, value) => {
        const newDefs = [...formData.definitions];
        newDefs[index] = value;
        setFormData(prev => ({
            ...prev,
            definitions: newDefs
        }));
    };

    const addDefinition = () => {
        setFormData(prev => ({
            ...prev,
            definitions: [...prev.definitions, '']
        }));
    };

    const removeDefinition = (index) => {
        setFormData(prev => ({
            ...prev,
            definitions: prev.definitions.filter((_, i) => i !== index)
        }));
    };

    const removeExample = (index) => {
        setFormData(prev => ({
            ...prev,
            examples: prev.examples.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); // Clear previous global errors
        try {
            const url = editingId
                ? `http://localhost:3000/api/words/${editingId}`
                : 'http://localhost:3000/api/words';

            const method = editingId ? 'PUT' : 'POST';

            // Prepare payload with fallback definition
            const payload = {
                ...formData,
                // Ensure legacy definition field is populated for backend validation if array logic fails
                definition: formData.definitions[0] || ''
            };

            const token = localStorage.getItem('adminToken');
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                // If conflict/duplicate, show alert but keep form
                // If conflict/duplicate, show inline error instead of alert
                if (response.status === 409) {
                    setTempError(data.error);
                    // Remove timeout to keep error visible until next action
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                }
                throw new Error(data.error || 'İşlem başarısız');
            }

            // Reset form and reload
            setFormData({
                lemma: '',
                origin: '',
                pos: 'isim',
                definitions: [''],
                examples: [{ sentence: '', author: '' }]
            });
            setEditingId(null);
            fetchWords(searchTerm);
            setToast({ show: true, message: `Kelime başarıyla ${editingId ? 'güncellendi' : 'eklendi'}!`, type: 'success' });

        } catch (err) {
            setToast({ show: true, message: 'Hata: ' + err.message, type: 'error' });
        }
    };

    const handleEdit = (word) => {
        setEditingId(word.id);
        setShowAllModal(false); // Close modal if editing from there
        // Fetch full details including examples because list endpoint might not have them?
        // Actually list endpoint in index.js checks LIKE query or all, but default list usually doesn't join examples always?
        // Better to fetch fresh detail.
        fetch(`http://localhost:3000/api/words/${word.id}`)
            .then(res => res.json())
            .then(data => {
                setFormData({
                    lemma: data.lemma,
                    origin: data.origin || '',
                    pos: data.pos || 'isim',
                    definitions: data.definitions && data.definitions.length > 0 ? data.definitions : [data.definition || ''],
                    examples: data.examples && data.examples.length > 0 ? data.examples : [{ sentence: '', author: '' }]
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
            })
            .catch(err => alert('Detay alınırken hata: ' + err.message));
    };

    const handleDelete = async (id) => {
        // Direct delete (confirmation handled in UI)
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`http://localhost:3000/api/words/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Silme işlemi başarısız');
            fetchWords(searchTerm); // Reload list
            if (showAllModal) fetchAllWords(page); // Reload modal page if deleting from modal
            setDeleteWordConfirmId(null); // Reset confirm state
        } catch (err) {
            alert('Hata: ' + err.message);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({
            lemma: '',
            origin: '',
            pos: 'isim',
            definitions: [''],
            examples: [{ sentence: '', author: '' }]
        });
    }

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/login');
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('http://localhost:3000/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newUser)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Kullanıcı oluşturulamadı');
            }

            setToast({ show: true, message: 'Kullanıcı başarıyla oluşturuldu', type: 'success' });
            setNewUser({ username: '', password: '' });
            fetchUsers();
        } catch (err) {
            setToast({ show: true, message: 'Hata: ' + err.message, type: 'error' });
        }
    };

    if (loading && !words.length) return <div className="text-center py-10">Yükleniyor...</div>;

    return (
        <div className="space-y-4 relative">
            {/* Top Bar: Auth & User Mgmt */}
            <div className="flex justify-between items-center bg-gray-100 p-3 rounded-md shadow-sm">
                <div className="text-sm text-gray-600">
                    <span className="hidden sm:inline">Hoşgeldin, </span>
                    <span className="font-bold text-gray-800">{localStorage.getItem('adminUser') || 'Admin'}</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggleUserForm}
                        className="text-xs sm:text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-200 font-medium transition-colors"
                    >
                        {showUserForm ? 'Yönetici Paneli Kapat' : 'Yönetici Paneli'}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-xs sm:text-sm bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 font-medium transition-colors"
                    >
                        Çıkış Yap
                    </button>
                </div>
            </div>

            {/* Collapsible Admin Panel */}
            {showUserForm && (
                <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* User List */}
                    <div>
                        <h3 className="font-bold text-indigo-900 mb-3 text-sm border-b border-indigo-200 pb-2">Mevcut Yöneticiler</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {users.map(user => (
                                <div key={user.id} className="flex justify-between items-center bg-white p-2 rounded border border-indigo-100 shadow-sm">
                                    <div className="text-sm">
                                        <span className="font-bold text-gray-700">{user.username}</span>
                                        <span className="text-xs text-indigo-400 ml-2">({user.role})</span>
                                    </div>
                                    {user.username !== 'admin' && (
                                        deleteConfirmId === user.id ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => confirmDeleteUser(user.id)}
                                                    className="text-white text-xs font-semibold px-2 py-1 bg-red-500 hover:bg-red-600 rounded transition-colors"
                                                >
                                                    Eminim, Sil
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmId(null)}
                                                    className="text-gray-600 text-xs font-semibold px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                                                >
                                                    İptal
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirmId(user.id)}
                                                className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                            >
                                                Sil
                                            </button>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add User Form */}
                    <div>
                        <h3 className="font-bold text-indigo-900 mb-3 text-sm border-b border-indigo-200 pb-2">Yeni Yönetici Ekle</h3>
                        <form onSubmit={handleAddUser} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Kullanıcı Adı</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                    className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="kullaniciadi"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Şifre</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="şifre"
                                />
                            </div>
                            <button type="submit" className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 font-medium w-full mt-2 shadow-sm transition-colors">
                                Kaydet
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-serif font-bold text-lugat-primary">Yönetim Paneli</h1>
                </div>

                <div className="flex items-center gap-4">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Kelime Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-lugat-secondary"
                        />
                        <button type="submit" className="bg-lugat-primary text-white px-3 py-1 rounded text-sm hover:bg-gray-700">Ara</button>
                    </form>
                    <Link to="/" className="text-lugat-secondary hover:underline text-sm font-medium">Ana Sayfa</Link>
                </div>
            </div>

            {/* Form Section */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-bold mb-4 text-gray-700 flex justify-between items-center">
                    {editingId ? 'Kelime Düzenle' : 'Yeni Kelime Ekle'}
                    {tempError && (
                        <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded font-bold animate-pulse">
                            {tempError}
                        </span>
                    )}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kelime (Lemma)</label>
                            <input
                                required
                                type="text"
                                name="lemma"
                                value={formData.lemma}
                                onChange={handleInputChange}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-lugat-secondary"
                                placeholder="Örn: Kalem"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Köken</label>
                            <select
                                name="origin"
                                value={formData.origin}
                                onChange={handleInputChange}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-lugat-secondary"
                            >
                                <option value="">Seçiniz</option>
                                <option value="Türkçe">Türkçe</option>
                                <option value="Arapça">Arapça</option>
                                <option value="Farsça">Farsça</option>
                                <option value="Fransızca">Fransızca</option>
                                <option value="İngilizce">İngilizce</option>
                                <option value="Yunanca">Yunanca</option>
                                <option value="Latince">Latince</option>
                                <option value="İtalyanca">İtalyanca</option>
                                <option value="Almanca">Almanca</option>
                                <option value="Moğolca">Moğolca</option>
                                <option value="Rumca">Rumca</option>
                                <option value="Rusça">Rusça</option>
                                <option value="Ermenice">Ermenice</option>
                                <option value="İspanyolca">İspanyolca</option>
                                <option value="Portekizce">Portekizce</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
                            <select
                                name="pos"
                                value={formData.pos}
                                onChange={handleInputChange}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-lugat-secondary"
                            >
                                <option value="isim">İsim</option>
                                <option value="fiil">Fiil</option>
                                <option value="sıfat">Sıfat</option>
                                <option value="zarf">Zarf</option>
                                <option value="zamir">Zamir</option>
                                <option value="edat">Edat</option>
                                <option value="bağlaç">Bağlaç</option>
                                <option value="ünlem">Ünlem</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanımlar</label>
                        {formData.definitions.map((def, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <textarea
                                    required
                                    value={def}
                                    onChange={(e) => handleDefinitionChange(index, e.target.value)}
                                    rows="2"
                                    className="flex-grow border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-lugat-secondary"
                                    placeholder={`${index + 1}. anlam`}
                                ></textarea>
                                {formData.definitions.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeDefinition(index)}
                                        className="text-red-500 hover:text-red-700 text-sm px-2 self-start mt-2"
                                    >
                                        Sil
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addDefinition}
                            className="text-sm text-lugat-primary hover:underline mt-1"
                        >
                            + Tanım Ekle
                        </button>
                    </div>

                    {/* Examples */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Örnek Cümleler</label>
                        {formData.examples.map((ex, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-2 mb-2">
                                <input
                                    type="text"
                                    value={ex.sentence}
                                    onChange={(e) => handleExampleChange(index, 'sentence', e.target.value)}
                                    className="flex-grow border border-gray-300 rounded px-3 py-2 text-sm"
                                    placeholder="Örnek cümle"
                                />
                                <input
                                    type="text"
                                    value={ex.author}
                                    onChange={(e) => handleExampleChange(index, 'author', e.target.value)}
                                    className="md:w-1/4 border border-gray-300 rounded px-3 py-2 text-sm"
                                    placeholder="Yazar (Opsiyonel)"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeExample(index)}
                                    className="text-red-500 hover:text-red-700 text-sm px-2"
                                >
                                    Sil
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addExample}
                            className="text-sm text-lugat-primary hover:underline mt-1"
                        >
                            + Örnek Ekle
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="bg-lugat-secondary text-white px-4 py-2 rounded text-sm font-bold hover:bg-orange-600 transition-colors"
                        >
                            {editingId ? 'Güncelle' : 'Kaydet'}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-bold hover:bg-gray-400 transition-colors"
                            >
                                İptal
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* List Section */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <table className="w-full table-fixed divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="w-[10%] px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="w-[20%] px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Kelime</th>
                            <th className="w-[45%] px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tanım</th>
                            <th className="w-[25%] px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {words.map((word) => (
                            <tr key={word.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(word)}>
                                <td className="px-1 py-4 text-sm text-gray-500 truncate text-center">{word.id}</td>
                                <td className="px-1 py-4 text-sm font-bold text-gray-900 break-words text-center">{word.lemma}</td>
                                <td className="px-1 py-4 text-sm text-gray-500 text-center break-words text-left">
                                    {word.definitions && word.definitions.length > 1 ? (
                                        <ol className="list-decimal list-inside text-left inline-block">
                                            {word.definitions.slice(0, 2).map((d, i) => (
                                                <li key={i} className="truncate max-w-xs">{d}</li>
                                            ))}
                                            {word.definitions.length > 2 && <li className="list-none text-xs text-gray-400">... ({word.definitions.length - 2} daha)</li>}
                                        </ol>
                                    ) : (
                                        word.definition
                                    )}
                                </td>
                                <td className="px-1 py-4 text-right text-sm font-medium">
                                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                                        <button
                                            onClick={() => handleEdit(word)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            Düzenle
                                        </button>
                                        {deleteWordConfirmId === word.id ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(word.id);
                                                    }}
                                                    className="text-white text-xs font-semibold px-2 py-1 bg-red-500 hover:bg-red-600 rounded transition-colors"
                                                >
                                                    Eminim, Sil
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteWordConfirmId(null);
                                                    }}
                                                    className="text-gray-600 text-xs font-semibold px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                                                >
                                                    İptal
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteWordConfirmId(word.id);
                                                }}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Sil
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="text-center mt-4 pb-8">
                <button
                    onClick={openAllWordsModal}
                    className="bg-gray-800 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-gray-900 shadow-lg"
                >
                    Tüm Kelimeleri Göster
                </button>
            </div>

            {/* All Words Modal */}
            {showAllModal && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center flex-wrap gap-4">
                            <h3 className="text-xl font-bold text-gray-800">Tüm Kelime Listesi</h3>
                            <div className="flex items-center gap-4">
                                <form onSubmit={handleModalSearch} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Listede Ara..."
                                        value={modalSearchTerm}
                                        onChange={(e) => setModalSearchTerm(e.target.value)}
                                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-lugat-secondary"
                                    />
                                    <button type="submit" className="bg-gray-700 text-white px-3 py-1 rounded text-sm hover:bg-gray-900">Bul</button>
                                </form>
                                <button onClick={() => setShowAllModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-auto">
                            {modalLoading ? (
                                <div className="flex justify-center items-center h-full">Yükleniyor...</div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kelime</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanım</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {allWords.map((word) => (
                                            <tr key={word.id} className="hover:bg-gray-50">
                                                <td className="px-1 py-4 text-sm text-gray-500 truncate text-center">{word.id}</td>
                                                <td className="px-1 py-4 text-sm font-bold text-gray-900 break-words text-center">{word.lemma}</td>
                                                <td className="px-1 py-4 text-sm text-gray-500 text-center break-words text-left">
                                                    {word.definitions && word.definitions.length > 1 ? (
                                                        <ol className="list-decimal list-inside text-left inline-block">
                                                            {word.definitions.map((d, i) => (
                                                                <li key={i}>{d}</li>
                                                            ))}
                                                        </ol>
                                                    ) : (
                                                        word.definition
                                                    )}
                                                </td>
                                                <td className="px-1 py-4 text-right text-sm font-medium">
                                                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                                                        <button
                                                            onClick={() => handleEdit(word)}
                                                            className="text-indigo-600 hover:text-indigo-900"
                                                        >
                                                            Düzenle
                                                        </button>
                                                        {deleteWordConfirmId === word.id ? (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(word.id);
                                                                    }}
                                                                    className="text-white text-xs font-semibold px-2 py-1 bg-red-500 hover:bg-red-600 rounded transition-colors"
                                                                >
                                                                    Eminim, Sil
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeleteWordConfirmId(null);
                                                                    }}
                                                                    className="text-gray-600 text-xs font-semibold px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                                                                >
                                                                    İptal
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setDeleteWordConfirmId(word.id);
                                                                }}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                Sil
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchAllWords(page - 1, modalSearchTerm)}
                                    disabled={page <= 1}
                                    className="px-3 py-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"
                                >
                                    &lt; Önceki
                                </button>
                                <span className="px-3 py-1 text-sm font-medium text-gray-700">
                                    Sayfa {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => fetchAllWords(page + 1, modalSearchTerm)}
                                    disabled={page >= totalPages}
                                    className="px-3 py-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"
                                >
                                    Sonraki &gt;
                                </button>
                            </div>
                            <div className="text-sm text-gray-500">
                                Toplam {totalPages * 50} civarı kelime
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Toast Notification */}
            {toast.show && (
                <div className="fixed top-4 right-4 z-50">
                    <div className={`rounded-lg shadow-lg p-4 min-w-[300px] ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                        } text-white transition-all duration-300`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {toast.type === 'success' ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                )}
                                <span className="font-medium">{toast.message}</span>
                            </div>
                            <button
                                onClick={() => setToast({ show: false, message: '', type: '' })}
                                className="ml-4 text-white hover:text-gray-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPage;
