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
    const [donationStats, setDonationStats] = useState(null);
    const [matchStats, setMatchStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [pets, setPets] = useState([]);
    const [pendingVets, setPendingVets] = useState([]);
    const [activeVets, setActiveVets] = useState([]);
    const [deletedUserMatches, setDeletedUserMatches] = useState([]);
    const [pendingShelters, setPendingShelters] = useState([]);
    const [reports, setReports] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [conversationMessages, setConversationMessages] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ status: 'all', type: 'all' });
    const [loadingTab, setLoadingTab] = useState(false);
    const [loadingQuery, setLoadingQuery] = useState(false);

    useEffect(() => {
        if (!token || user?.role !== 'admin') {
            navigate('/app');
        }
    }, [token, user, navigate]);

    // Guard duro: no renderizamos el panel hasta confirmar que somos admin.
    // Evita el flash de la UI + los fetch de admin corriendo antes del redirect.
    if (!token || user?.role !== 'admin') return null;

    const authHeaders = useCallback(() => ({
        Authorization: `Bearer ${token}`
    }), [token]);

    // ─── FETCH FUNCTIONS ────
    const fetchStats = useCallback(async (isTabChange = false) => {
        if (isTabChange) { setLoadingTab(true); setLoadingQuery(false); } else { setLoadingQuery(true); }
        try {
            const [res, donRes, matchRes] = await Promise.all([
                fetch(`${API}/api/admin/stats`, { headers: authHeaders() }),
                fetch(`${API}/api/donations/stats`, { headers: authHeaders() }),
                fetch(`${API}/api/admin/match-stats`, { headers: authHeaders() }),
            ]);
            const data = await res.json();
            if (res.ok) setStats(data);
            if (donRes.ok) setDonationStats(await donRes.json());
            if (matchRes.ok) setMatchStats(await matchRes.json());
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

    const fetchPendingVets = useCallback(async (isTabChange = false) => {
        if (isTabChange) { setLoadingTab(true); setLoadingQuery(false); } else { setLoadingQuery(true); }
        try {
            const res = await fetch(`${API}/api/vets/admin/pending`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) setPendingVets(data.vets || []);
        } catch (err) {
            console.error(err);
        }
        if (isTabChange) setLoadingTab(false); else setLoadingQuery(false);
    }, [authHeaders]);

    const fetchActiveVets = useCallback(async (isTabChange = false) => {
        if (isTabChange) { setLoadingTab(true); setLoadingQuery(false); } else { setLoadingQuery(true); }
        try {
            const res = await fetch(`${API}/api/vets/admin/active`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) setActiveVets(data.vets || []);
        } catch (err) {
            console.error(err);
        }
        if (isTabChange) setLoadingTab(false); else setLoadingQuery(false);
    }, [authHeaders]);

    const fetchPendingShelters = useCallback(async (isTabChange = false) => {
        if (isTabChange) { setLoadingTab(true); setLoadingQuery(false); } else { setLoadingQuery(true); }
        try {
            const res = await fetch(`${API}/api/shelters/admin/pending`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) setPendingShelters(data.shelters || []);
        } catch (err) {
            console.error(err);
        }
        if (isTabChange) setLoadingTab(false); else setLoadingQuery(false);
    }, [authHeaders]);

    const handleApproveShelter = async (id) => {
        try {
            const res = await fetch(`${API}/api/shelters/admin/${id}/approve`, {
                method: 'PATCH',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ approved: true }),
            });
            if (res.ok) fetchPendingShelters();
        } catch (err) {
            console.error(err);
        }
    };

    const fetchReports = useCallback(async (isTabChange = false) => {
        if (isTabChange) { setLoadingTab(true); setLoadingQuery(false); } else { setLoadingQuery(true); }
        try {
            const res = await fetch(`${API}/api/admin/reports`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) setReports(data.reports || []);
        } catch (err) {
            console.error(err);
        }
        if (isTabChange) setLoadingTab(false); else setLoadingQuery(false);
    }, [authHeaders]);

    const updateReportStatus = async (id, status) => {
        try {
            const res = await fetch(`${API}/api/admin/reports/${id}`, {
                method: 'PATCH',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteReportedMessage = async (messageId, reportId) => {
        if (!confirm('¿Borrar este mensaje denunciado?')) return;
        try {
            const res = await fetch(`${API}/api/admin/messages/${messageId}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            if (res.ok) {
                // Marcamos la denuncia como revisada tras actuar sobre ella.
                updateReportStatus(reportId, 'reviewed');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchDeletedUserMatches = useCallback(async (isTabChange = false) => {
        if (isTabChange) { setLoadingTab(true); setLoadingQuery(false); } else { setLoadingQuery(true); }
        try {
            const res = await fetch(`${API}/api/admin/deleted-user-matches`, { headers: authHeaders() });
            const data = await res.json();
            if (res.ok) setDeletedUserMatches(data.items || []);
        } catch (err) {
            console.error(err);
        }
        if (isTabChange) setLoadingTab(false); else setLoadingQuery(false);
    }, [authHeaders]);

    const markDeletedUserMatchRead = async (id) => {
        try {
            const res = await fetch(`${API}/api/admin/deleted-user-matches/${id}/read`, {
                method: 'PATCH',
                headers: authHeaders(),
            });
            if (res.ok) {
                setDeletedUserMatches((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
            }
        } catch (err) {
            console.error(err);
        }
    };

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
        if (tab === 'vets') fetchPendingVets(true);
        if (tab === 'vets_active') fetchActiveVets(true);
        if (tab === 'shelters') fetchPendingShelters(true);
        if (tab === 'alerts') fetchDeletedUserMatches(true);
        if (tab === 'reports') fetchReports(true);
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

    const handleSetVetPlan = async (id, plan) => {
        try {
            const res = await fetch(`${API}/api/vets/admin/${id}/plan`, {
                method: 'PATCH',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan }),
            });
            if (res.ok) fetchActiveVets();
            else {
                const data = await res.json();
                alert(data.error || 'No se pudo cambiar el plan.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSetVetApproval = async (id, approved) => {
        if (!confirm(approved ? '¿Aprobar esta veterinaria?' : '¿Rechazar / desaprobar esta veterinaria?')) return;
        try {
            const res = await fetch(`${API}/api/vets/admin/${id}/approve`, {
                method: 'PATCH',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ approved }),
            });
            if (res.ok) fetchPendingVets();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteMessage = async (id) => {
        if (!confirm('Eliminar este mensaje?')) return;
        try {
            const res = await fetch(`${API}/api/admin/messages/${id}`, { method: 'DELETE', headers: authHeaders() });
            if (res.ok && activeConversation) {
                fetchConversationMessages(activeConversation);
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
        { id: 'vets', label: 'Vets pendientes' },
        { id: 'vets_active', label: 'Vets activas' },
        { id: 'shelters', label: 'Refugios pendientes' },
        { id: 'alerts', label: 'Alertas' },
        { id: 'reports', label: 'Denuncias' },
    ];

    const REASON_LABEL = {
        spam: 'Spam', harassment: 'Acoso', scam: 'Estafa / recompensa',
        inappropriate: 'Contenido inapropiado', other: 'Otro',
    };
    const STATUS_LABEL = { pending: 'Pendiente', reviewed: 'Revisada', dismissed: 'Descartada' };

    const PLAN_OPTIONS = [
        { value: 'ally', label: 'Ally (gratis)', color: null },
        { value: 'sponsor_basic', label: 'Socio Mimo ⭐ (Basic)', color: '#FF5C6C' },
        { value: 'sponsor_pro', label: 'Socio Mimo ⭐ (Pro)', color: '#9B6DFF' },
        { value: 'sponsor_nation', label: 'Socio Mimo ⭐ (Nation)', color: '#FFB830' },
    ];
    const PLAN_LABEL = Object.fromEntries(PLAN_OPTIONS.map(o => [o.value, o.label]));
    const PLAN_COLOR = Object.fromEntries(PLAN_OPTIONS.map(o => [o.value, o.color]));

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

            {/* Search bar (no aplica a dashboard ni al listado de vets pendientes) */}
            {activeTab !== 'dashboard' && activeTab !== 'vets' && activeTab !== 'vets_active' && activeTab !== 'shelters' && activeTab !== 'alerts' && activeTab !== 'reports' && !loadingTab && (
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

                        {/* Refugios & Adopciones — analytics solo para admin. Los refugios
                            no ven sus propias métricas (decisión de producto: no aporta valor). */}
                        <div className="mt-12">
                            <h3 className="text-lg font-semibold mb-4">Refugios & Adopciones</h3>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                                {[
                                    { label: 'Refugios', value: stats.totalShelters, color: 'bg-emerald-50 text-emerald-700' },
                                    { label: 'Pendientes', value: stats.pendingShelters, color: 'bg-yellow-50 text-yellow-700' },
                                    { label: 'En adopción', value: stats.totalAdoptionsActive, color: 'bg-pink-50 text-pink-700' },
                                    { label: 'Adoptadas', value: stats.totalAdopted, color: 'bg-teal-50 text-teal-700' },
                                    { label: 'Perros / Gatos', value: `${stats.adoptionsBySpecies?.dog ?? 0} / ${stats.adoptionsBySpecies?.cat ?? 0}`, color: 'bg-indigo-50 text-indigo-700' },
                                    { label: 'Días promedio', value: stats.avgDaysToAdopt != null ? stats.avgDaysToAdopt : '—', color: 'bg-orange-50 text-orange-700' },
                                ].map(stat => (
                                    <div key={stat.label} className={`${stat.color} rounded-2xl p-4`}>
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                        <p className="text-sm opacity-70">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-6 flex-wrap">
                                <div className="flex-1 min-w-[280px]">
                                    <h4 className="font-semibold mb-3">Top refugios (adopciones concretadas)</h4>
                                    <div className="flex flex-col gap-3">
                                        {stats.topShelters?.length === 0 ? (
                                            <p className="text-xs text-gray-400">Todavía no hay refugios activos.</p>
                                        ) : (
                                            stats.topShelters?.map((s) => (
                                                <Link key={s.id} to={`/shelters/${s.slug}`}
                                                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50">
                                                    {s.logo_url ? (
                                                        <img src={s.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-mimo-coral text-white flex items-center justify-center font-bold">{s.name.charAt(0)}</div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{s.name}</p>
                                                        <p className="text-xs text-gray-400">{s.city || 'Sin ciudad'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-semibold text-teal-600">{s.adopted_count} adoptadas</p>
                                                        <p className="text-xs text-gray-400">{s.active_count} activas</p>
                                                    </div>
                                                </Link>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-[280px]">
                                    <h4 className="font-semibold mb-3">Últimas publicaciones</h4>
                                    <div className="flex flex-col gap-3">
                                        {stats.recentAdoptions?.length === 0 ? (
                                            <p className="text-xs text-gray-400">Todavía no hay publicaciones activas.</p>
                                        ) : (
                                            stats.recentAdoptions?.map((ap) => (
                                                <Link key={ap.id} to={`/adoptions/${ap.id}`}
                                                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50">
                                                    {ap.photos?.[0] ? (
                                                        <img src={ap.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">🐾</div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{ap.name || 'Sin nombre'}</p>
                                                        <p className="text-xs text-gray-400 truncate">{ap.shelter_name} · {formatDate(ap.created_at)}</p>
                                                    </div>
                                                </Link>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reencuentros & Matching — dos métricas distintas:
                            reencuentros totales (todo caso cerrado) vs calidad del
                            matching del AI (subset que vino de un match). */}
                        {matchStats ? (
                            <div className="mt-12">
                                <h3 className="text-lg font-semibold mb-4">Reencuentros & Matching</h3>
                                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                                    <div className="bg-green-50 text-green-700 rounded-2xl p-4">
                                        <p className="text-2xl font-bold">{matchStats.reunions_total}</p>
                                        <p className="text-sm opacity-70">Reencuentros totales</p>
                                    </div>
                                    <div className="bg-emerald-50 text-emerald-700 rounded-2xl p-4">
                                        <p className="text-2xl font-bold">{matchStats.reunions_30d}</p>
                                        <p className="text-sm opacity-70">Últimos 30 días</p>
                                    </div>
                                    <div className="bg-blue-50 text-blue-700 rounded-2xl p-4">
                                        <p className="text-2xl font-bold">{matchStats.matches_generated}</p>
                                        <p className="text-sm opacity-70">Matches AI generados</p>
                                    </div>
                                    <div className="bg-teal-50 text-teal-700 rounded-2xl p-4">
                                        <p className="text-2xl font-bold">{matchStats.matches_reunited}</p>
                                        <p className="text-sm opacity-70">Matches → reunidos</p>
                                    </div>
                                    <div className="bg-red-50 text-red-700 rounded-2xl p-4">
                                        <p className="text-2xl font-bold">{matchStats.matches_rejected}</p>
                                        <p className="text-sm opacity-70">Falsos positivos</p>
                                    </div>
                                    <div className="bg-purple-50 text-purple-700 rounded-2xl p-4">
                                        <p className="text-2xl font-bold">{matchStats.precision_pct != null ? `${matchStats.precision_pct}%` : '—'}</p>
                                        <p className="text-sm opacity-70">Precisión matching</p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Distancia visual promedio de los matches: {matchStats.avg_distance != null ? matchStats.avg_distance : '—'}
                                    {' · '}Precisión = reunidos / (reunidos + falsos positivos). {matchStats.matches_pending} matches todavía sin veredicto.
                                </p>
                            </div>
                        ) : null}

                        {/* Donaciones — fase 1: solo clicks en el banner de MP. Aún no
                            hay tracking de donaciones concretadas (requiere webhook MP). */}
                        {donationStats ? (
                            <div className="mt-12">
                                <h3 className="text-lg font-semibold mb-1">Donaciones</h3>
                                <p className="text-xs text-gray-400 mb-4">
                                    Clicks en el botón "Donar por Mercado Pago". Todavía no medimos
                                    donaciones concretadas (requiere integración con MP).
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-sky-50 text-sky-700 rounded-2xl p-4">
                                        <p className="text-2xl font-bold">{donationStats.total_clicks}</p>
                                        <p className="text-sm opacity-70">Clicks totales</p>
                                    </div>
                                    <div className="bg-cyan-50 text-cyan-700 rounded-2xl p-4">
                                        <p className="text-2xl font-bold">{donationStats.clicks_30d}</p>
                                        <p className="text-sm opacity-70">Últimos 30 días</p>
                                    </div>
                                </div>
                                {donationStats.top_pets?.length > 0 ? (
                                    <div>
                                        <h4 className="font-semibold mb-3">Casos que más motivan a donar</h4>
                                        <div className="flex flex-col gap-3 max-w-lg">
                                            {donationStats.top_pets.map((p) => (
                                                <Link key={p.pet_id} to={`/pet/${p.pet_id}`}
                                                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50">
                                                    {p.photo_url ? (
                                                        <img src={p.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">🐾</div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{p.pet_name || `Caso #${p.pet_id}`}</p>
                                                    </div>
                                                    <span className="text-xs font-semibold text-sky-600">{p.clicks} clicks</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
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

                {/* ─── VETS TAB ─────────────────────────────── */}
                {activeTab === 'vets' && !loadingTab && !loadingQuery && (
                    <div className="overflow-x-auto w-full">
                        {pendingVets.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No hay veterinarias pendientes de aprobación.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-400 border-b">
                                        <th className="pb-2 pr-4">ID</th>
                                        <th className="pb-2 pr-4">Nombre</th>
                                        <th className="pb-2 pr-4">Email vet</th>
                                        <th className="pb-2 pr-4">Ciudad</th>
                                        <th className="pb-2 pr-4">Owner</th>
                                        <th className="pb-2 pr-4">Registro</th>
                                        <th className="pb-2">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingVets.map(v => (
                                        <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="py-3 pr-4 text-gray-400">{v.id}</td>
                                            <td className="py-3 pr-4 font-medium">
                                                <Link to={`/vets/${v.slug}`} className="hover:underline">{v.name}</Link>
                                            </td>
                                            <td className="py-3 pr-4 text-gray-500">{v.email || '—'}</td>
                                            <td className="py-3 pr-4 text-gray-500">{v.city || '—'}</td>
                                            <td className="py-3 pr-4 text-gray-500">
                                                {v.owner_name}
                                                <br />
                                                <span className="text-xs text-gray-400">{v.owner_email}</span>
                                            </td>
                                            <td className="py-3 pr-4 text-gray-400">{formatDate(v.created_at)}</td>
                                            <td className="py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleSetVetApproval(v.id, true)}
                                                        className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                                    >
                                                        Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() => handleSetVetApproval(v.id, false)}
                                                        className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                    >
                                                        Rechazar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ─── VETS ACTIVAS TAB (gestión de plan) ─────────── */}
                {activeTab === 'vets_active' && !loadingTab && !loadingQuery && (
                    <div className="overflow-x-auto w-full">
                        {activeVets.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No hay veterinarias aprobadas todavía.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-400 border-b">
                                        <th className="pb-2 pr-4">ID</th>
                                        <th className="pb-2 pr-4">Nombre</th>
                                        <th className="pb-2 pr-4">Ciudad</th>
                                        <th className="pb-2 pr-4">Owner</th>
                                        <th className="pb-2 pr-4">Plan actual</th>
                                        <th className="pb-2">Cambiar plan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeVets.map(v => (
                                        <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="py-3 pr-4 text-gray-400">{v.id}</td>
                                            <td className="py-3 pr-4 font-medium">
                                                <Link to={`/vets/${v.slug}`} className="hover:underline">{v.name}</Link>
                                            </td>
                                            <td className="py-3 pr-4 text-gray-500">{v.city || '—'}</td>
                                            <td className="py-3 pr-4 text-gray-500">
                                                {v.owner_name}
                                                <br />
                                                <span className="text-xs text-gray-400">{v.owner_email}</span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                {PLAN_COLOR[v.plan] ? (
                                                    <span
                                                        style={{ backgroundColor: PLAN_COLOR[v.plan] }}
                                                        className="text-xs px-2 py-1 rounded-full text-white font-semibold"
                                                    >
                                                        {PLAN_LABEL[v.plan]}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                                        {PLAN_LABEL[v.plan] || v.plan}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <select
                                                    value={v.plan}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        if (next === v.plan) return;
                                                        if (!confirm(`Cambiar plan de ${v.name} a "${PLAN_LABEL[next]}"?`)) return;
                                                        handleSetVetPlan(v.id, next);
                                                    }}
                                                    className="px-3 py-2 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-100"
                                                >
                                                    {PLAN_OPTIONS.map(o => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ─── MODAL DE CONVERSACIÓN (contexto de una denuncia) ───
                    Reemplaza la vieja tab "Mensajes" de navegar-todo (privacidad).
                    Solo se abre desde una denuncia puntual, no hay browse general. */}
                {activeConversation && (
                    <div
                        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                        onClick={() => { setActiveConversation(null); setConversationMessages([]); }}
                    >
                        <div
                            className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm font-semibold">{activeConversation.user_a_name} y {activeConversation.user_b_name}</p>
                                    <p className="text-xs text-gray-400">Caso: {activeConversation.pet_name || `#${activeConversation.pet_id}`}</p>
                                </div>
                                <button
                                    onClick={() => { setActiveConversation(null); setConversationMessages([]); }}
                                    className="text-gray-400 hover:text-gray-900 text-lg"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {loadingQuery ? (
                                    <p className="text-center text-gray-400 py-8 text-sm">Cargando…</p>
                                ) : conversationMessages.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8 text-sm">Sin mensajes en este hilo.</p>
                                ) : (
                                    conversationMessages.map(m => (
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
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── SHELTERS PENDIENTES TAB ─────────────────── */}
                {activeTab === 'shelters' && !loadingTab && !loadingQuery && (
                    <div className="space-y-3" style={{ width: '100%', maxWidth: '900px' }}>
                        {pendingShelters.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No hay refugios pendientes.</p>
                        ) : (
                            pendingShelters.map((s) => (
                                <div key={s.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{s.name}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            Owner: {s.owner_name || '—'} · {s.owner_email || s.email || 'sin email'}
                                            {s.city ? ` · ${s.city}` : ''}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(s.created_at)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link
                                            to={`/shelters/${s.slug}`}
                                            className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
                                        >
                                            Ver
                                        </Link>
                                        <button
                                            onClick={() => handleApproveShelter(s.id)}
                                            className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-medium hover:bg-gray-800"
                                        >
                                            Aprobar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ─── ALERTS TAB ────────────────────────────── */}
                {activeTab === 'alerts' && !loadingTab && !loadingQuery && (
                    <div className="space-y-3" style={{ width: '100%', maxWidth: '900px' }}>
                        <p className="text-xs text-gray-500 mb-3">
                            Matches del AI donde el dueño del pet original se dio de baja de la app.
                            Contactalos por el email histórico para coordinar por fuera.
                        </p>
                        {deletedUserMatches.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">Sin alertas por ahora.</p>
                        ) : (
                            deletedUserMatches.map((n) => {
                                const d = n.data || {};
                                const isUnread = !n.read_at;
                                return (
                                    <div
                                        key={n.id}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                            isUnread ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'
                                        }`}
                                    >
                                        {d.new_pet_photo && (
                                            <img src={d.new_pet_photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                Match {d.new_pet_status === 'lost' ? 'perdida' : 'encontrada'} #{d.new_pet_id} ↔ original #{d.original_pet_id}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                Ex-dueño: <span className="font-mono">{d.original_user_email || 'sin email'}</span>
                                                {d.original_pet_name ? ` · original: ${d.original_pet_name}` : ''}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {d.original_user_email && (
                                                <a
                                                    href={`mailto:${d.original_user_email}?subject=Posible%20coincidencia%20de%20tu%20mascota%20en%20Mimo`}
                                                    className="px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium hover:bg-gray-700"
                                                >
                                                    Contactar
                                                </a>
                                            )}
                                            <Link
                                                to={`/pet/${d.new_pet_id}`}
                                                className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
                                            >
                                                Ver match
                                            </Link>
                                            {isUnread && (
                                                <button
                                                    onClick={() => markDeletedUserMatchRead(n.id)}
                                                    className="text-[10px] text-gray-500 hover:text-gray-900"
                                                >
                                                    Marcar leída
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* ─── DENUNCIAS TAB ─────────────────────────── */}
                {activeTab === 'reports' && !loadingTab && !loadingQuery && (
                    <div className="space-y-3" style={{ width: '100%', maxWidth: '900px' }}>
                        <p className="text-xs text-gray-500 mb-3">
                            Denuncias de usuarios y mensajes. El reportante ya pudo haber bloqueado a la persona.
                        </p>
                        {reports.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No hay denuncias.</p>
                        ) : (
                            reports.map((r) => {
                                const pending = r.status === 'pending';
                                return (
                                    <div
                                        key={r.id}
                                        className={`p-4 rounded-2xl border transition-all ${
                                            pending ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-900 text-white">
                                                        {REASON_LABEL[r.reason] || r.reason}
                                                    </span>
                                                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                                                        r.status === 'pending' ? 'bg-red-100 text-red-700'
                                                            : r.status === 'reviewed' ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                        {STATUS_LABEL[r.status]}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">{formatDate(r.created_at)}</span>
                                                </div>
                                                <p className="text-sm mt-2">
                                                    <span className="text-gray-400">Denunció</span>{' '}
                                                    <span className="font-medium">{r.reporter_name}</span>{' '}
                                                    <span className="text-gray-400">a</span>{' '}
                                                    <span className="font-medium">{r.reported_name}</span>
                                                    {r.reported_deleted_at ? <span className="text-[10px] text-red-500 ml-1">(cuenta eliminada)</span> : null}
                                                </p>
                                                <p className="text-[11px] text-gray-400 font-mono truncate">{r.reported_email}</p>
                                                {r.message_snapshot ? (
                                                    <div className="mt-2 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-100" style={{ overflowWrap: 'anywhere' }}>
                                                        “{r.message_snapshot}”
                                                    </div>
                                                ) : null}
                                                {r.note ? (
                                                    <p className="mt-2 text-xs text-gray-500">Nota: {r.note}</p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {r.pet_id ? (
                                                <button
                                                    onClick={() => fetchConversationMessages({
                                                        pet_id: r.pet_id,
                                                        user_a_id: r.reporter_id,
                                                        user_b_id: r.reported_user_id,
                                                        pet_name: null,
                                                        user_a_name: r.reporter_name,
                                                        user_b_name: r.reported_name,
                                                    })}
                                                    className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
                                                >
                                                    Ver conversación
                                                </button>
                                            ) : null}
                                            {r.pet_id ? (
                                                <Link to={`/pet/${r.pet_id}`} className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">
                                                    Ver caso
                                                </Link>
                                            ) : null}
                                            {r.message_id ? (
                                                <button
                                                    onClick={() => deleteReportedMessage(r.message_id, r.id)}
                                                    className="px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100"
                                                >
                                                    Borrar mensaje
                                                </button>
                                            ) : null}
                                            {pending ? (
                                                <>
                                                    <button
                                                        onClick={() => updateReportStatus(r.id, 'reviewed')}
                                                        className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-medium hover:bg-gray-800"
                                                    >
                                                        Marcar revisada
                                                    </button>
                                                    <button
                                                        onClick={() => updateReportStatus(r.id, 'dismissed')}
                                                        className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200"
                                                    >
                                                        Descartar
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => updateReportStatus(r.id, 'pending')}
                                                    className="px-3 py-1.5 rounded-full text-gray-400 text-xs font-medium hover:bg-gray-100"
                                                >
                                                    Reabrir
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* ─── PAGINATION ────────────────────────────── */}
                {activeTab !== 'dashboard' && activeTab !== 'vets' && activeTab !== 'vets_active' && activeTab !== 'shelters' && activeTab !== 'alerts' && activeTab !== 'reports' && !loadingTab && !loadingQuery && !activeConversation && pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => {
                                    if (activeTab === 'users') fetchUsers(p, search);
                                    if (activeTab === 'pets') fetchPets(p, search, filters);
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
