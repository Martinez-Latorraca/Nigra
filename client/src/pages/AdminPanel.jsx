import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

function AdminPanel() {
    const token = useSelector(state => state.user?.token);
    const user = useSelector(state => state.user?.data);
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [pets, setPets] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [conversationMessages, setConversationMessages] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ status: 'all', type: 'all' });
    const [loadingTab, setLoadingTab] = useState(false);
    const [loadingQuery, setLoadingQuery] = useState(false);

    useEffect(() => {
        if (!token || user?.role !== 'admin') {
            navigate('/');
        }
    }, [token, user, navigate]);

    const authHeaders = useCallback(() => ({
        Authorization: `Bearer ${token}`
    }), [token]);

    // ─── FETCH FUNCTIONS ────
    const fetchStats = useCallback(async (isTabChange = false) => {
        if (isTabChange) { setLoadingTab(true); setLoadingQuery(false); } else { setLoadingQuery(true); }
        try {
            const res = await fetch(`${API}/api/admin/stats`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) setStats(data);
        } catch (err) {
            console.error(err);
        }
        if (isTabChange) setLoadingTab(false); else setLoadingQuery(false);
    }, [authHeaders]);

    const fetchUsers = useCallback(async (page = 1, searchVal = '', isTabChange = false) => {
        if (isTabChange) { setLoadingTab(true); setLoadingQuery(false); } else { setLoadingQuery(true); }
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (searchVal) params.set('search', searchVal);
            const res = await fetch(`${API}/api/admin/users?${params}`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) {
                setUsers(data.users);
                setPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
            }
        } catch (err) {
            console.error(err);
        }
        if (isTabChange) setLoadingTab(false); else setLoadingQuery(false);
    }, [authHeaders]);

    const fetchPets = useCallback(async (page = 1, searchVal = '', filtersVal = { status: 'all', type: 'all' }, isTabChange = false) => {
        if (isTabChange) { setLoadingTab(true); setLoadingQuery(false); } else { setLoadingQuery(true); }
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (searchVal) params.set('search', searchVal);
            if (filtersVal.status !== 'all') params.set('status', filtersVal.status);
            if (filtersVal.type !== 'all') params.set('type', filtersVal.type);
            const res = await fetch(`${API}/api/admin/pets?${params}`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) {
                setPets(data.pets);
                setPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
            }
        } catch (err) {
            console.error(err);
        }
        if (isTabChange) setLoadingTab(false); else setLoadingQuery(false);
    }, [authHeaders]);

    const fetchConversations = useCallback(async (page = 1, searchVal = '', isTabChange = false) => {
        if (isTabChange) { setLoadingTab(true); setLoadingQuery(false); } else { setLoadingQuery(true); }
        setActiveConversation(null);
        setConversationMessages([]);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (searchVal) params.set('search', searchVal);
            const res = await fetch(`${API}/api/admin/conversations?${params}`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) {
                setConversations(data.conversations);
                setPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
            }
        } catch (err) {
            console.error(err);
        }
        if (isTabChange) setLoadingTab(false); else setLoadingQuery(false);
    }, [authHeaders]);

    const fetchConversationMessages = async (conv) => {
        setActiveConversation(conv);
        setLoadingQuery(true);
        try {
            const res = await fetch(`${API}/api/admin/conversations/${conv.pet_id}/${conv.user_a_id}/${conv.user_b_id}`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) setConversationMessages(data.messages);
        } catch (err) {
            console.error(err);
        }
        setLoadingQuery(false);
    };

    const handleTabChange = (tab) => {
        setSearch('');
        setFilters({ status: 'all', type: 'all' });
        setActiveTab(tab);
        if (tab === 'dashboard') fetchStats(true);
        if (tab === 'users') fetchUsers(1, '', true);
        if (tab === 'pets') fetchPets(1, '', { status: 'all', type: 'all' }, true);
        if (tab === 'messages') fetchConversations(1, '', true);
    };

    // Initial fetch on mount
    const initialized = useState(false);
    if (!initialized[0]) {
        initialized[1](true);
        fetchStats(true);
    }

    // Re-fetch on search/filter (debounced) - using ref to avoid effect setState lint
    const debounceRef = useState(null);
    const handleSearchChange = (value) => {
        setSearch(value);
        if (debounceRef[0]) clearTimeout(debounceRef[0]);
        debounceRef[1](setTimeout(() => {
            if (activeTab === 'users') fetchUsers(1, value);
            if (activeTab === 'pets') fetchPets(1, value, filters);
            if (activeTab === 'messages') fetchConversations(1, value);
        }, 400));
    };

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        fetchPets(1, search, newFilters);
    };

    // ─── ACTIONS ────────────────────────────────────────
    const handleDeleteUser = async (id) => {
        if (!confirm('Eliminar usuario y todos sus datos?')) return;
        try {
            const res = await fetch(`${API}/api/admin/users/${id}`, { method: 'DELETE', headers: authHeaders() });
            if (res.ok) fetchUsers(pagination.page, search);
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleRole = async (id, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (!confirm(`Cambiar rol a "${newRole}"?`)) return;
        try {
            const res = await fetch(`${API}/api/admin/users/${id}/role`, {
                method: 'PATCH',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            if (res.ok) fetchUsers(pagination.page, search);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeletePet = async (id) => {
        if (!confirm('Eliminar este reporte?')) return;
        try {
            const res = await fetch(`${API}/api/admin/pets/${id}`, { method: 'DELETE', headers: authHeaders() });
            if (res.ok) fetchPets(pagination.page, search, filters);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteMessage = async (id) => {
        if (!confirm('Eliminar este mensaje?')) return;
        try {
            const res = await fetch(`${API}/api/admin/messages/${id}`, { method: 'DELETE', headers: authHeaders() });
            if (res.ok) {
                if (activeConversation) {
                    fetchConversationMessages(activeConversation);
                } else {
                    fetchConversations(pagination.page, search);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (user?.role !== 'admin') return null;

    const tabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'users', label: 'Usuarios' },
        { id: 'pets', label: 'Reportes' },
        { id: 'messages', label: 'Mensajes' },
    ];

    const formatDate = (d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="max-w-7xl mx-auto flex flex-col items-center px-4 py-8">
            <div className='flex flex-col '>

                <h1 className="text-2xl font-bold mb-6">Panel de Administracion</h1>

                {/* Tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-6 border-b border-gray-200 pb-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap text-center ${activeTab === tab.id
                                ? 'bg-black text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search bar (not on dashboard) */}
            {activeTab !== 'dashboard' && !loadingTab && (
                <div className="mb-6 flex flex-wrap gap-4 items-end">
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">Buscar</label>
                        <input
                            type="text"
                            placeholder="Nombre, email, descripcion..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-64 px-5 py-4 bg-gray-50 text-gray-900 rounded-2xl border border-gray-100 focus:bg-white focus:ring-4 focus:ring-gray-100 outline-none transition-all font-medium"
                        />
                    </div>
                    {activeTab === 'pets' && (
                        <>
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">Estado</label>
                                <div className="relative group">
                                    <select
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 text-gray-900 font-medium outline-none focus:ring-4 focus:ring-gray-100 transition-all appearance-none cursor-pointer pr-12"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="lost">Perdidos</option>
                                        <option value="found">Encontrados</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">Especie</label>
                                <div className="relative group">
                                    <select
                                        value={filters.type}
                                        onChange={(e) => handleFilterChange({ ...filters, type: e.target.value })}
                                        className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 text-gray-900 font-medium outline-none focus:ring-4 focus:ring-gray-100 transition-all appearance-none cursor-pointer pr-12"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="dog">Perros</option>
                                        <option value="cat">Gatos</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-300 px-1 pb-4">{pagination.total} resultados</span>
                </div>
            )}

            <div className="flex flex-col items-center w-full max-w-6xl mx-auto">
                {(loadingTab || loadingQuery) && <div className="text-center py-8 text-gray-400">{loadingTab ? 'Cargando tab...' : 'Buscando...'}</div>}

                {/* ─── DASHBOARD TAB ─────────────────────────── */}
                {activeTab === 'dashboard' && stats && !loadingTab && !loadingQuery && (
                    <div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                            {[
                                { label: 'Usuarios', value: stats.totalUsers, color: 'bg-blue-50 text-blue-700' },
                                { label: 'Reportes', value: stats.totalPets, color: 'bg-purple-50 text-purple-700' },
                                { label: 'Mensajes', value: stats.totalMessages, color: 'bg-green-50 text-green-700' },
                                { label: 'Perdidos', value: stats.totalLost, color: 'bg-red-50 text-red-700' },
                                { label: 'Encontrados', value: stats.totalFound, color: 'bg-amber-50 text-amber-700' },
                            ].map(stat => (
                                <div key={stat.label} className={`${stat.color} rounded-2xl p-4`}>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-sm opacity-70">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-6">
                            <div>
                                <h3 className="font-semibold mb-3">Reportes recientes</h3>
                                <div className="flex flex-col gap-4">
                                    {stats.recentPets.map(pet => (
                                        <Link to={`/pet/${pet.id}`} key={pet.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                            <img src={pet.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{pet.name || 'Sin nombre'}</p>
                                                <p className="text-xs text-gray-400">{pet.reporter_name} - {formatDate(pet.created_at)}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${pet.status === 'lost' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {pet.status === 'lost' ? 'Perdido' : 'Encontrado'}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-3">Usuarios recientes</h3>
                                <div className="flex flex-col gap-4">
                                    {stats.recentUsers.map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 min-h-[58px] gap-3">
                                            <div>
                                                <p className="text-sm font-medium">{u.name}</p>
                                                <p className="text-xs text-gray-400">{u.email}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {u.role === 'admin' && <span className="text-xs px-2 py-1 bg-black text-white rounded-full">Admin</span>}
                                                <span className="text-xs text-gray-400">{formatDate(u.created_at)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── USERS TAB ────────────────────────────── */}
                {activeTab === 'users' && !loadingTab && !loadingQuery && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 border-b">
                                    <th className="pb-2 pr-4">ID</th>
                                    <th className="pb-2 pr-4">Nombre</th>
                                    <th className="pb-2 pr-4">Email</th>
                                    <th className="pb-2 pr-4">Rol</th>
                                    <th className="pb-2 pr-4">Registro</th>
                                    <th className="pb-2">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-3 pr-4 text-gray-400">{u.id}</td>
                                        <td className="py-3 pr-4 font-medium">{u.name}</td>
                                        <td className="py-3 pr-4 text-gray-500">{u.email}</td>
                                        <td className="py-3 pr-4">
                                            <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-400">{formatDate(u.created_at)}</td>
                                        <td className="py-3">
                                            <div className="flex gap-2">
                                                {u.id !== user.id && (
                                                    <>
                                                        <button
                                                            onClick={() => handleToggleRole(u.id, u.role)}
                                                            className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                        >
                                                            {u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </>
                                                )}
                                                {u.id === user.id && <span className="text-xs text-gray-300">Sos vos</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ─── PETS TAB ─────────────────────────────── */}
                {activeTab === 'pets' && !loadingTab && !loadingQuery && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 border-b">
                                    <th className="pb-2 pr-4">Foto</th>
                                    <th className="pb-2 pr-4">Nombre</th>
                                    <th className="pb-2 pr-4">Estado</th>
                                    <th className="pb-2 pr-4">Tipo</th>
                                    <th className="pb-2 pr-4">Reportado por</th>
                                    <th className="pb-2 pr-4">Fecha</th>
                                    <th className="pb-2">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pets.map(p => (
                                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="py-3 pr-4">
                                            <img src={p.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                        </td>
                                        <td className="py-3 pr-4 font-medium">{p.name || 'Sin nombre'}</td>
                                        <td className="py-3 pr-4">
                                            <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'lost' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {p.status === 'lost' ? 'Perdido' : 'Encontrado'}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500 capitalize">{p.type === 'dog' ? 'Perro' : 'Gato'}</td>
                                        <td className="py-3 pr-4 text-gray-500">{p.reporter_name}</td>
                                        <td className="py-3 pr-4 text-gray-400">{formatDate(p.created_at)}</td>
                                        <td className="py-3">
                                            <button
                                                onClick={() => handleDeletePet(p.id)}
                                                className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ─── MESSAGES TAB ──────────────────────────── */}
                {activeTab === 'messages' && !loadingTab && !loadingQuery && !activeConversation && (
                    <div className="space-y-2" style={{ width: '100%', maxWidth: '700px' }}>
                        {conversations.map(c => (
                            <div
                                key={`${c.pet_id}-${c.user_a_id}-${c.user_b_id}`}
                                onClick={() => fetchConversationMessages(c)}
                                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-all"
                            >
                                {c.pet_photo && <img src={c.pet_photo} alt="" className="w-12 h-12 rounded-xl object-cover" />}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{c.user_a_name} y {c.user_b_name}</p>
                                    <p className="text-xs text-gray-400">Mascota: {c.pet_name || `#${c.pet_id}`}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">{formatDate(c.last_message_at)}</p>
                                    <p className="text-xs font-medium text-gray-500">{c.message_count} mensajes</p>
                                </div>
                            </div>
                        ))}
                        {conversations.length === 0 && <p className="text-center text-gray-400 py-8">No hay conversaciones</p>}
                    </div>
                )}

                {/* ─── CONVERSATION DETAIL ────────────────────── */}
                {activeTab === 'messages' && !loadingTab && !loadingQuery && activeConversation && (
                    <div className="flex flex-col" style={{ width: '700px', maxWidth: '50%' }}>
                        <div>
                            <button
                                onClick={() => { setActiveConversation(null); setConversationMessages([]); }}
                                className="mb-4 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                ← Volver a conversaciones
                            </button>
                            <div className="flex items-center gap-3 mb-4">
                                {activeConversation.pet_photo && <img src={activeConversation.pet_photo} alt="" className="w-10 h-10 rounded-xl object-cover" />}
                                <div>
                                    <p className="text-sm font-semibold">{activeConversation.user_a_name} y {activeConversation.user_b_name}</p>
                                    <p className="text-xs text-gray-400">Mascota: {activeConversation.pet_name || `#${activeConversation.pet_id}`}</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-y-auto p-4 bg-white rounded-2xl border border-gray-100" style={{ maxHeight: 'calc(100vh - 480px)' }}>
                            {conversationMessages.map(m => (
                                <div key={m.id} className="mb-4 group">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-semibold text-gray-700">{m.sender_name}</span>
                                        <span className="text-[10px] text-gray-300">{new Date(m.created_at).toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-2" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{m.content}</p>
                                        <button
                                            onClick={() => handleDeleteMessage(m.id)}
                                            className="opacity-0 group-hover:opacity-100 shrink-0 text-xs px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── PAGINATION ────────────────────────────── */}
                {activeTab !== 'dashboard' && !loadingTab && !loadingQuery && !activeConversation && pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => {
                                    if (activeTab === 'users') fetchUsers(p, search);
                                    if (activeTab === 'pets') fetchPets(p, search, filters);
                                    if (activeTab === 'messages') fetchConversations(p, search);
                                }}
                                className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${p === pagination.page
                                    ? 'bg-black text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminPanel;
