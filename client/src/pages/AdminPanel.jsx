import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import AdminIcon from '../components/admin/AdminIcon';
import { translateColor, translateType } from '../utils/translations';

// Panel de admin (diseños Admin-*.dc.html del handoff). Solo cambió lo visual:
// las llamadas a la API, los permisos y las confirmaciones son las de antes.

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
    // Contadores de pendientes para la barra lateral y "Requiere atención".
    const [counts, setCounts] = useState({ vets: 0, shelters: 0, reports: 0, alerts: 0 });
    const [reportFilter, setReportFilter] = useState('pending');
    const [userFilters, setUserFilters] = useState({ type: 'all', role: 'all' });
    const [vetFilters, setVetFilters] = useState({ q: '', plan: 'all' });

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
    // Pendientes: se cuentan con los mismos listados que usan las pestañas
    // (/api/admin/stats no los trae y el panel no toca el servidor).
    const refreshCounts = useCallback(async () => {
        const get = (url) => fetch(`${API}${url}`, { headers: authHeaders() }).then(r => (r.ok ? r.json() : null)).catch(() => null);
        const [v, s, r, a] = await Promise.all([
            get('/api/vets/admin/pending'),
            get('/api/shelters/admin/pending'),
            get('/api/admin/reports'),
            get('/api/admin/deleted-user-matches'),
        ]);
        setCounts({
            vets: v?.vets?.length || 0,
            shelters: s?.shelters?.length || 0,
            reports: (r?.reports || []).filter(x => x.status === 'pending').length,
            alerts: (a?.items || []).filter(x => !x.read_at).length,
        });
    }, [authHeaders]);

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
            if (res.ok) { fetchPendingShelters(); refreshCounts(); }
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
                refreshCounts();
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

    // Expulsa al denunciado: soft delete + veto del email para que no pueda
    // volver a registrarse ni entrar con Google/Facebook/Apple.
    // El confirm es explícito porque no hay deshacer desde el panel.
    const banReportedUser = async (report) => {
        const ok = window.confirm(
            `Eliminar a ${report.reported_name} y bloquear su email?\n\n` +
            `${report.reported_email}\n\n` +
            `Se elimina la cuenta y no va a poder registrarse de nuevo con ese email, ` +
            `ni entrar con Google/Facebook/Apple. Sus veterinarias o refugios también se dan de baja.\n\n` +
            `Esto no se puede deshacer desde el panel.`
        );
        if (!ok) return;
        try {
            const res = await fetch(`${API}/api/admin/users/${report.reported_user_id}/ban`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ report_id: report.id, reason: report.reason }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) fetchReports();
            else alert(data.error || 'No se pudo eliminar al usuario.');
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
        refreshCounts();
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
        refreshCounts();
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

    // Convierte un usuario en veterinaria o refugio. Necesario porque quien se
    // registra con Google/Facebook/Apple no puede elegir el tipo de cuenta: el
    // proveedor solo devuelve nombre y mail, así que queda como particular sin
    // forma de convertirse. Queda SIN aprobar — la aprobación sigue siendo un
    // paso aparte, en la pestaña de Vets o Refugios.
    const handleSetAccountType = async (id, accountType) => {
        const label = accountType === 'vet' ? 'veterinaria' : 'refugio';
        if (!confirm(`Convertir este usuario en ${label}?\n\nQueda pendiente de aprobación: después tenés que aprobarlo desde la pestaña correspondiente.`)) return;
        try {
            const res = await fetch(`${API}/api/admin/users/${id}/account-type`, {
                method: 'PATCH',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_type: accountType }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) fetchUsers(pagination.page, search);
            else alert(data.error || 'No se pudo cambiar el tipo de cuenta.');
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
            if (res.ok) { fetchPendingVets(); refreshCounts(); }
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

    const REASON_LABEL = {
        spam: 'Spam', harassment: 'Acoso', scam: 'Estafa / recompensa',
        inappropriate: 'Contenido inapropiado', other: 'Otro',
    };
    const STATUS_LABEL = { pending: 'Pendiente', reviewed: 'Revisada', dismissed: 'Descartada' };
    const STATUS_COLOR = { pending: C.coral, reviewed: C.teal, dismissed: C.lineaFuerte };

    const PLAN_OPTIONS = [
        { value: 'ally', label: 'Ally (gratis)', short: 'Ally', color: null, km: null },
        { value: 'sponsor_basic', label: 'Socio Mimo · Basic', short: 'Basic', color: C.coral, km: 5 },
        { value: 'sponsor_pro', label: 'Socio Mimo · Pro', short: 'Pro', color: C.violeta, km: 20 },
        { value: 'sponsor_nation', label: 'Socio Mimo · Nation', short: 'Nation', color: C.sol, km: 50 },
    ];
    const PLAN = Object.fromEntries(PLAN_OPTIONS.map(o => [o.value, o]));

    const formatDate = (d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatTime = (d) => new Date(d).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const n = (v) => (v == null ? '—' : Number(v).toLocaleString('es-AR'));
    const petKind = (p) => [translateType(p.type), translateColor(p.color)].filter(Boolean).map(cap).join(' · ');

    const NAV = [
        { id: 'dashboard', label: 'Dashboard', icon: 'layoutDashboard' },
        { id: 'users', label: 'Usuarios', icon: 'users' },
        { id: 'pets', label: 'Reportes', icon: 'pawPrint' },
        { group: 'Aprobaciones' },
        { id: 'vets', label: 'Vets pendientes', icon: 'stethoscope', count: counts.vets },
        { id: 'vets_active', label: 'Vets activas', icon: 'badgeCheck' },
        { id: 'shelters', label: 'Refugios pendientes', icon: 'houseHeart', count: counts.shelters },
        { group: 'Moderación' },
        { id: 'alerts', label: 'Alertas', icon: 'bellRing', count: counts.alerts },
        { id: 'reports', label: 'Denuncias', icon: 'flag', count: counts.reports },
    ];

    const loading = loadingTab || loadingQuery;

    // Denuncias: filtro por estado en el cliente.
    const reportCounts = {
        pending: reports.filter(r => r.status === 'pending').length,
        reviewed: reports.filter(r => r.status === 'reviewed').length,
        dismissed: reports.filter(r => r.status === 'dismissed').length,
        all: reports.length,
    };
    const visibleReports = reportFilter === 'all' ? reports : reports.filter(r => r.status === reportFilter);

    // Usuarios: filtros Tipo y Rol sobre la página actual (en el cliente).
    const userType = (u) => (u.vet_id ? 'vet' : u.shelter_id ? 'shelter' : 'person');
    const visibleUsers = users.filter(u =>
        (userFilters.type === 'all' || userType(u) === userFilters.type) &&
        (userFilters.role === 'all' || u.role === userFilters.role)
    );

    // Vets activas: resumen y filtros sobre la lista que ya viene.
    const planCounts = Object.fromEntries(PLAN_OPTIONS.map(o => [o.value, activeVets.filter(v => v.plan === o.value).length]));
    const visibleVets = activeVets.filter(v =>
        (vetFilters.plan === 'all' || v.plan === vetFilters.plan) &&
        (!vetFilters.q || `${v.name} ${v.city || ''} ${v.owner_name || ''}`.toLowerCase().includes(vetFilters.q.toLowerCase()))
    );

    // Mensajes denunciados de la conversación abierta (borde Coral).
    const flaggedIds = new Set(reports.filter(r => r.message_id).map(r => r.message_id));

    const closeConversation = () => { setActiveConversation(null); setConversationMessages([]); };

    return (
        <div className="flex min-h-screen font-sans" style={{ background: C.crema, color: C.noche }}>
            {/* ─── BARRA LATERAL ─── */}
            <aside
                className="w-[264px] shrink-0 sticky top-0 h-screen box-border px-4 py-7 flex flex-col gap-1 overflow-y-auto"
                style={{ background: C.noche, color: C.crema }}
            >
                <div className="flex items-center gap-2.5 px-2 pb-[22px]">
                    <img src="/landing/pin.svg" alt="" width={30} height={37} />
                    <Wordmark size={26} color={C.crema} />
                    <span className="ml-1 px-2.5 py-[3px] rounded-full text-xs font-bold" style={{ background: C.noche2, letterSpacing: '.06em' }}>Admin</span>
                </div>
                {NAV.map((item) =>
                    item.group ? (
                        <p key={item.group} className="mt-[18px] mb-1.5 mx-3 text-[11px] font-bold uppercase" style={{ letterSpacing: '.12em', color: C.lavanda }}>
                            {item.group}
                        </p>
                    ) : (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            aria-current={activeTab === item.id ? 'page' : undefined}
                            className="flex items-center gap-3 h-11 px-3 rounded-[14px] text-[15px] border-0 cursor-pointer text-left w-full"
                            style={activeTab === item.id
                                ? { background: C.crema, color: C.noche, fontWeight: 700 }
                                : { background: 'transparent', color: C.crema, fontWeight: 500 }}
                        >
                            <AdminIcon name={item.icon} size={20} />
                            {item.label}
                            {item.count ? (
                                <span className="ml-auto min-w-[22px] h-[22px] px-[7px] box-border rounded-full text-xs font-bold flex items-center justify-center" style={{ background: C.coral, color: C.arena }}>
                                    {item.count}
                                </span>
                            ) : null}
                        </button>
                    )
                )}
                <div className="mt-auto flex items-center gap-2.5 px-2.5 pt-3.5" style={{ borderTop: `1px solid ${C.linea}` }}>
                    <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-display font-black" style={{ background: C.violeta, color: C.arena }}>
                        {(user.name || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="flex flex-col min-w-0">
                        <span className="text-sm font-bold truncate">{user.name}</span>
                        <span className="text-xs truncate" style={{ color: C.lavanda }}>{user.email}</span>
                    </span>
                    <Link to="/" title="Salir del panel" aria-label="Salir del panel" className="ml-auto" style={{ color: C.crema }}>
                        <AdminIcon name="logOut" size={20} />
                    </Link>
                </div>
            </aside>

            {/* ─── CONTENIDO ─── */}
            <main className="flex-1 min-w-0 box-border px-10 pt-9 pb-12 flex flex-col gap-7">
                {activeTab === 'dashboard' && (
                    <>
                        <PageHeader title="Dashboard" sub="Cómo viene Mimo hoy." />
                        <Section title="Requiere atención">
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
                                <AttentionCard icon="stethoscope" color={C.noche} title={`${counts.vets} ${counts.vets === 1 ? 'veterinaria' : 'veterinarias'}`} sub="esperan aprobación" onClick={() => handleTabChange('vets')} />
                                <AttentionCard icon="houseHeart" color={C.teal} title={`${counts.shelters} ${counts.shelters === 1 ? 'refugio' : 'refugios'}`} sub="esperan verificación" onClick={() => handleTabChange('shelters')} />
                                <AttentionCard icon="flag" color={C.coral} title={`${counts.reports} ${counts.reports === 1 ? 'denuncia' : 'denuncias'}`} sub="pendientes de revisar" onClick={() => handleTabChange('reports')} />
                                <AttentionCard icon="bellRing" color={C.sol} title={`${counts.alerts} ${counts.alerts === 1 ? 'alerta' : 'alertas'}`} sub="coincidencias con cuentas eliminadas" onClick={() => handleTabChange('alerts')} />
                            </div>
                        </Section>
                        {loading && !stats ? <Loading /> : null}
                        {stats ? (
                            <>
                                <Section title="Actividad">
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                                        <Metric label="Usuarios" value={n(stats.totalUsers)} color={C.violeta} icon="users" />
                                        <Metric label="Reportes" value={n(stats.totalPets)} color={C.noche} icon="pawPrint" />
                                        <Metric label="Perdidos" value={n(stats.totalLost)} color={C.coral} icon="search" />
                                        <Metric label="Encontrados" value={n(stats.totalFound)} color={C.teal} icon="mapPin" />
                                        <Metric label="Mensajes" value={n(stats.totalMessages)} color={C.sol} icon="messageCircle" />
                                    </div>
                                </Section>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <ListCard title="Reportes recientes" onAll={() => handleTabChange('pets')}>
                                        {stats.recentPets.map(pet => (
                                            <ListRow key={pet.id} to={`/pet/${pet.id}`} thumb={<Thumb src={pet.photo_url} />}
                                                title={pet.name || 'Sin nombre'} sub={`${pet.reporter_name} · ${formatDate(pet.created_at)}`}
                                                right={<StatusChip status={pet.status} />} />
                                        ))}
                                    </ListCard>
                                    <ListCard title="Usuarios recientes" onAll={() => handleTabChange('users')}>
                                        {stats.recentUsers.map(u => (
                                            <ListRow key={u.id} thumb={<Initial name={u.name} color={C.violeta} />}
                                                title={u.name} sub={u.email}
                                                right={u.role === 'admin' ? <Chip color={C.noche} text={C.crema}>Admin</Chip> : <span className="text-[13px]">{formatDate(u.created_at)}</span>} />
                                        ))}
                                    </ListCard>
                                </div>

                                {matchStats ? (
                                    <Section title="Reencuentros y matching">
                                        <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1.4fr] gap-3.5">
                                            <Metric label="Reencuentros" value={n(matchStats.reunions_total)} color={C.violeta} icon="handshake" sub={`${n(matchStats.reunions_30d)} en los últimos 30 días`} />
                                            <Metric label="Matches generados" value={n(matchStats.matches_generated)} color={C.sol} icon="scan" />
                                            <Metric label="Match → reunidos" value={n(matchStats.matches_reunited)} color={C.teal} icon="circleCheck" />
                                            <Metric label="Falsos positivos" value={n(matchStats.matches_rejected)} color={C.coral} icon="circleX" />
                                            <Metric label="Precisión del matching" value={matchStats.precision_pct != null ? `${matchStats.precision_pct} %` : '—'} color={C.violeta} icon="target"
                                                sub={`Reunidos / (reunidos + falsos positivos) · ${n(matchStats.matches_pending)} sin veredicto`}
                                                bar={matchStats.precision_pct} />
                                        </div>
                                        <p className="m-0 text-[13px]">Distancia visual promedio de los matches: {matchStats.avg_distance != null ? matchStats.avg_distance : '—'}.</p>
                                    </Section>
                                ) : null}

                                <Section title="Refugios y adopciones">
                                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
                                        <Metric label="Refugios" value={n(stats.totalShelters)} color={C.teal} icon="houseHeart" />
                                        <Metric label="Pendientes" value={n(stats.pendingShelters)} color={C.sol} icon="clock" />
                                        <Metric label="En adopción" value={n(stats.totalAdoptionsActive)} color={C.violeta} icon="heart" />
                                        <Metric label="Adoptadas" value={n(stats.totalAdopted)} color={C.teal} icon="partyPopper" />
                                        <Metric label="Perros / gatos" value={`${stats.adoptionsBySpecies?.dog ?? 0}/${stats.adoptionsBySpecies?.cat ?? 0}`} color={C.noche} icon="pawPrint" />
                                        <Metric label="Días promedio" value={stats.avgDaysToAdopt != null ? stats.avgDaysToAdopt : '—'} color={C.coral} icon="timer" sub="hasta ser adoptada" />
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <ListCard title="Top refugios">
                                            {stats.topShelters?.length ? stats.topShelters.map((s) => (
                                                <ListRow key={s.id} to={`/shelters/${s.slug}`}
                                                    thumb={s.logo_url ? <Thumb src={s.logo_url} /> : <Initial name={s.name} color={C.teal} square />}
                                                    title={s.name} sub={s.city || 'Sin ciudad'}
                                                    right={<span className="flex flex-col items-end text-[13px]"><b>{s.adopted_count} adoptadas</b><span>{s.active_count} activas</span></span>} />
                                            )) : <Empty>Todavía no hay refugios activos.</Empty>}
                                        </ListCard>
                                        <ListCard title="Últimas publicaciones">
                                            {stats.recentAdoptions?.length ? stats.recentAdoptions.map((ap) => (
                                                <ListRow key={ap.id} to={`/adoptions/${ap.id}`} thumb={<Thumb src={ap.photos?.[0]} />}
                                                    title={ap.name || 'Sin nombre'} sub={`${ap.shelter_name} · ${formatDate(ap.created_at)}`}
                                                    right={<Chip color={C.violeta}>En adopción</Chip>} />
                                            )) : <Empty>Todavía no hay publicaciones activas.</Empty>}
                                        </ListCard>
                                    </div>
                                </Section>

                                {donationStats ? (
                                    <Section title="Donaciones">
                                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_2fr] gap-3.5 items-start">
                                            <Metric label="Clicks en Donar" value={n(donationStats.total_clicks)} color={C.coral} icon="heart" sub="Total histórico" />
                                            <Metric label="Últimos 30 días" value={n(donationStats.clicks_30d)} color={C.coral} icon="trendingUp" />
                                            <ListCard title="Casos que más motivan a donar">
                                                {donationStats.top_pets?.length ? donationStats.top_pets.map((p) => (
                                                    <ListRow key={p.pet_id} to={`/pet/${p.pet_id}`} thumb={<Thumb src={p.photo_url} />}
                                                        title={p.pet_name || 'Sin nombre'} sub={`Caso #${p.pet_id}`}
                                                        right={<b className="text-[13px]">{p.clicks} clicks</b>} />
                                                )) : <Empty>Todavía no hay clicks asociados a un caso.</Empty>}
                                            </ListCard>
                                        </div>
                                        <Note>Por ahora medimos clicks en "Donar por Mercado Pago". Las donaciones concretadas necesitan la integración con Mercado Pago.</Note>
                                    </Section>
                                ) : null}
                            </>
                        ) : null}
                    </>
                )}

                {/* ─── USUARIOS ─── */}
                {activeTab === 'users' && (
                    <>
                        <PageHeader title="Usuarios" sub="Todas las cuentas de Mimo: personas, veterinarias y refugios." />
                        <Toolbar>
                            <SearchInput value={search} onChange={handleSearchChange} placeholder="Buscar por nombre o email" />
                            <SelectPill label="Tipo" value={userFilters.type} onChange={(v) => setUserFilters({ ...userFilters, type: v })}
                                options={[['all', 'Todos'], ['person', 'Personas'], ['vet', 'Veterinarias'], ['shelter', 'Refugios']]} />
                            <SelectPill label="Rol" value={userFilters.role} onChange={(v) => setUserFilters({ ...userFilters, role: v })}
                                options={[['all', 'Todos'], ['admin', 'Admin'], ['user', 'Usuario']]} />
                            <Results n={pagination.total} />
                        </Toolbar>
                        {loading ? <Loading /> : (
                            <>
                                <Table head={['ID', 'Usuario', 'Rol', 'Tipo', 'Registro', 'Acciones']}>
                                    {visibleUsers.map(u => (
                                        <tr key={u.id}>
                                            <Td><span className="text-[13px]">#{u.id}</span></Td>
                                            <Td>
                                                <span className="flex items-center gap-3">
                                                    <Initial name={u.name} color={u.vet_id ? C.noche : u.shelter_id ? C.teal : C.violeta} size={38} />
                                                    <span className="flex flex-col"><b className="text-[15px]">{u.name}</b><span className="text-[13px]">{u.email}</span></span>
                                                </span>
                                            </Td>
                                            <Td>{u.role === 'admin' ? <Chip color={C.noche} text={C.crema}>Admin</Chip> : <span className="text-[13px]">Usuario</span>}</Td>
                                            <Td>
                                                <span className="flex gap-1.5">
                                                    {u.vet_id ? <Chip color={u.vet_approved ? C.noche : C.sol} text={u.vet_approved ? C.crema : C.arena}>{u.vet_approved ? 'Vet' : 'Vet · pendiente'}</Chip> : null}
                                                    {u.shelter_id ? <Chip color={u.shelter_approved ? C.teal : C.sol}>{u.shelter_approved ? 'Refugio' : 'Refugio · pendiente'}</Chip> : null}
                                                    {!u.vet_id && !u.shelter_id ? <span className="text-[13px]">Particular</span> : null}
                                                </span>
                                            </Td>
                                            <Td><span className="text-sm">{formatDate(u.created_at)}</span></Td>
                                            <Td>
                                                {u.id === user.id ? <span className="text-[13px] font-bold">Sos vos</span> : (
                                                    <span className="flex gap-1.5">
                                                        <IconBtn icon="shield" title={u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'} onClick={() => handleToggleRole(u.id, u.role)} />
                                                        {!u.vet_id ? <IconBtn icon="stethoscope" title="Convertir en vet" onClick={() => handleSetAccountType(u.id, 'vet')} /> : null}
                                                        {!u.shelter_id ? <IconBtn icon="houseHeart" title="Convertir en refugio" onClick={() => handleSetAccountType(u.id, 'shelter')} /> : null}
                                                        <IconBtn icon="trash" title="Eliminar cuenta" danger onClick={() => handleDeleteUser(u.id)} />
                                                    </span>
                                                )}
                                            </Td>
                                        </tr>
                                    ))}
                                </Table>
                                <Legend items={[['shield', 'Hacer / quitar admin'], ['stethoscope', 'Convertir en vet'], ['houseHeart', 'Convertir en refugio'], ['trash', 'Eliminar cuenta']]} />
                                <Pager pagination={pagination} onPage={(p) => fetchUsers(p, search)} />
                            </>
                        )}
                    </>
                )}

                {/* ─── REPORTES ─── */}
                {activeTab === 'pets' && (
                    <>
                        <PageHeader title="Reportes" sub="Mascotas perdidas y encontradas publicadas por la comunidad." />
                        <Toolbar>
                            <SearchInput value={search} onChange={handleSearchChange} placeholder="Buscar por nombre o descripción" />
                            <SelectPill label="Estado" value={filters.status} onChange={(v) => handleFilterChange({ ...filters, status: v })}
                                options={[['all', 'Todos'], ['lost', 'Perdidos'], ['found', 'Encontrados']]} />
                            <SelectPill label="Especie" value={filters.type} onChange={(v) => handleFilterChange({ ...filters, type: v })}
                                options={[['all', 'Todas'], ['dog', 'Perros'], ['cat', 'Gatos']]} />
                            <Results n={pagination.total} />
                        </Toolbar>
                        {loading ? <Loading /> : (
                            <>
                                <Table head={['Mascota', 'Estado', 'Tipo', 'Reportado por', 'Fecha', 'Acciones']}>
                                    {pets.map(p => (
                                        <tr key={p.id}>
                                            <Td><span className="flex items-center gap-3"><Thumb src={p.photo_url} /><b className="text-[15px]">{p.name || 'Sin nombre'}</b></span></Td>
                                            <Td><StatusChip status={p.status} /></Td>
                                            <Td><span className="text-sm">{petKind(p)}</span></Td>
                                            <Td><span className="text-sm">{p.reporter_name}</span></Td>
                                            <Td><span className="text-sm">{formatDate(p.created_at)}</span></Td>
                                            <Td>
                                                <span className="flex gap-1.5">
                                                    <IconBtn icon="externalLink" title="Ver ficha" to={`/pet/${p.id}`} />
                                                    <IconBtn icon="trash" title="Eliminar reporte" danger onClick={() => handleDeletePet(p.id)} />
                                                </span>
                                            </Td>
                                        </tr>
                                    ))}
                                </Table>
                                <Pager pagination={pagination} onPage={(p) => fetchPets(p, search, filters)} />
                            </>
                        )}
                    </>
                )}

                {/* ─── VETS PENDIENTES ─── */}
                {activeTab === 'vets' && (
                    <>
                        <PageHeader title="Veterinarias pendientes" sub="Revisá los datos antes de aprobar: al aprobarla aparece en el directorio y empieza a recibir alertas." />
                        {loading ? <Loading /> : pendingVets.length === 0 ? <EmptyCard>No hay veterinarias pendientes de aprobación.</EmptyCard> : (
                            <div className="flex flex-col gap-3">
                                {pendingVets.map(v => (
                                    <EntityCard key={v.id}
                                        thumb={<Initial name={v.name} color={C.noche} size={56} square text={C.crema} />}
                                        title={v.name} chip={<Chip color={C.sol}>Pendiente</Chip>}
                                        meta={[['mail', v.email || 'Sin email'], ['mapPin', v.city || 'Sin ciudad'], ['user', `${v.owner_name || '—'} · ${v.owner_email || ''}`], ['calendar', formatDate(v.created_at)]]}
                                        actions={<>
                                            <Btn icon="externalLink" to={`/vets/${v.slug}`}>Ver ficha</Btn>
                                            <Btn icon="x" variant="danger" onClick={() => handleSetVetApproval(v.id, false)}>Rechazar</Btn>
                                            <Btn icon="check" variant="teal" onClick={() => handleSetVetApproval(v.id, true)}>Aprobar</Btn>
                                        </>} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ─── VETS ACTIVAS ─── */}
                {activeTab === 'vets_active' && (
                    <>
                        <PageHeader title="Veterinarias activas" sub="Cambiá el plan de cada clínica. Se pide confirmación antes de aplicar el cambio." />
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {PLAN_OPTIONS.filter(o => o.color).map(o => (
                                <span key={o.value} className="flex items-center gap-2.5 px-4 py-3.5 rounded-[18px]" style={{ background: o.color, color: C.arena }}>
                                    <span className="flex flex-col"><span className="text-xs font-bold">{o.short}</span><span className="font-display font-black text-[22px]">{planCounts[o.value]}</span></span>
                                    <span className="ml-auto text-[13px] text-right">{o.km} km de alcance</span>
                                </span>
                            ))}
                            <span className="flex flex-col px-4 py-3.5 rounded-[18px] bg-white" style={{ border: `1px solid ${C.arena}` }}>
                                <span className="text-xs font-bold">Ally (gratis)</span>
                                <span className="font-display font-black text-[22px]">{planCounts.ally}</span>
                            </span>
                        </div>
                        <Toolbar>
                            <SearchInput value={vetFilters.q} onChange={(v) => setVetFilters({ ...vetFilters, q: v })} placeholder="Buscar veterinaria" />
                            <SelectPill label="Plan" value={vetFilters.plan} onChange={(v) => setVetFilters({ ...vetFilters, plan: v })}
                                options={[['all', 'Todos'], ...PLAN_OPTIONS.map(o => [o.value, o.short === 'Ally' ? 'Ally' : o.short])]} />
                        </Toolbar>
                        {loading ? <Loading /> : activeVets.length === 0 ? <EmptyCard>No hay veterinarias aprobadas todavía.</EmptyCard> : (
                            <Table head={['Veterinaria', 'Dueño', 'Plan actual', 'Cambiar plan']}>
                                {visibleVets.map(v => (
                                    <tr key={v.id}>
                                        <Td>
                                            <Link to={`/vets/${v.slug}`} className="flex items-center gap-3 no-underline" style={{ color: C.noche }}>
                                                <Initial name={v.name} color={C.noche} size={38} square text={C.crema} />
                                                <span className="flex flex-col"><b className="text-[15px]">{v.name}</b><span className="text-[13px]">{v.city || 'Sin ciudad'}</span></span>
                                            </Link>
                                        </Td>
                                        <Td><span className="flex flex-col text-sm"><b>{v.owner_name || '—'}</b><span className="text-[13px]">{v.owner_email}</span></span></Td>
                                        <Td>
                                            {PLAN[v.plan]?.color ? (
                                                <span className="inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-xs font-bold" style={{ background: PLAN[v.plan].color, color: C.arena }}>
                                                    <AdminIcon name="sparkles" size={12} />{PLAN[v.plan].label}
                                                </span>
                                            ) : <Chip color={C.arena} text={C.noche}>{PLAN[v.plan]?.label || v.plan}</Chip>}
                                        </Td>
                                        <Td>
                                            <span className="relative inline-flex items-center gap-2 h-10 px-3 rounded-xl text-sm font-bold min-w-[220px] box-border" style={{ border: `1.5px solid ${C.arena}` }}>
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0 box-border" style={PLAN[v.plan]?.color ? { background: PLAN[v.plan].color } : { border: `1.5px solid ${C.noche}` }} />
                                                {PLAN[v.plan]?.label || v.plan}
                                                <AdminIcon name="chevronDown" size={18} className="ml-auto" />
                                                <select
                                                    aria-label={`Cambiar plan de ${v.name}`}
                                                    value={v.plan}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        if (next === v.plan) return;
                                                        if (!confirm(`Cambiar plan de ${v.name} a "${PLAN[next].label}"?`)) return;
                                                        handleSetVetPlan(v.id, next);
                                                    }}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                >
                                                    {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </span>
                                        </Td>
                                    </tr>
                                ))}
                            </Table>
                        )}
                    </>
                )}

                {/* ─── REFUGIOS PENDIENTES ─── */}
                {activeTab === 'shelters' && (
                    <>
                        <PageHeader title="Refugios pendientes" sub="Refugios que se registraron y esperan verificación." />
                        <Note icon="shield">Antes de aprobar, chequeá los comprobantes que el refugio mandó por email (papeles de la ONG, cuenta bancaria a nombre del refugio, redes sociales).</Note>
                        {loading ? <Loading /> : pendingShelters.length === 0 ? <EmptyCard>No hay refugios pendientes.</EmptyCard> : (
                            <div className="flex flex-col gap-3">
                                {pendingShelters.map(s => (
                                    <EntityCard key={s.id}
                                        thumb={<Initial name={s.name} color={C.teal} size={56} square />}
                                        title={s.name} chip={<Chip color={C.sol}>Pendiente de aprobación</Chip>}
                                        meta={[['user', `${s.owner_name || '—'} · ${s.owner_email || s.email || 'sin email'}`], ['mapPin', s.city || 'Sin ciudad'], ['calendar', formatDate(s.created_at)]]}
                                        actions={<>
                                            <Btn icon="externalLink" to={`/shelters/${s.slug}`}>Ver perfil</Btn>
                                            <Btn icon="check" variant="teal" onClick={() => handleApproveShelter(s.id)}>Aprobar</Btn>
                                        </>} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ─── ALERTAS ─── */}
                {activeTab === 'alerts' && (
                    <>
                        <PageHeader title="Alertas" sub="Matches de la IA donde el dueño de la mascota original ya se dio de baja." />
                        <Note>Contactalos por el email que tenían registrado para coordinar el reencuentro por fuera de la app.</Note>
                        {loading ? <Loading /> : deletedUserMatches.length === 0 ? <EmptyCard>Sin alertas por ahora.</EmptyCard> : (
                            <div className="flex flex-col gap-3">
                                {deletedUserMatches.map((nItem) => {
                                    const d = nItem.data || {};
                                    const isUnread = !nItem.read_at;
                                    return (
                                        <div key={nItem.id} className="flex items-center gap-4 p-[18px] rounded-3xl bg-white" style={{ border: `2px solid ${isUnread ? C.coral : 'transparent'}` }}>
                                            <span className="relative flex gap-1.5 items-center">
                                                <Thumb src={d.new_pet_photo} size={56} />
                                                <AdminIcon name="arrowLeftRight" size={18} />
                                                <Thumb src={d.original_pet_photo} size={56} />
                                                {isUnread ? <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full box-border" style={{ background: C.coral, border: '3px solid #fff' }} /> : null}
                                            </span>
                                            <span className="flex-1 min-w-0 flex flex-col gap-1">
                                                <span className="flex items-center gap-2">
                                                    <b className="text-base">Match con mascota {d.new_pet_status === 'lost' ? 'perdida' : 'encontrada'} #{d.new_pet_id} ↔ original #{d.original_pet_id}</b>
                                                    {isUnread ? <Chip color={C.coral}>Nueva</Chip> : null}
                                                </span>
                                                <span className="text-sm">Ex-dueño: <b>{d.original_user_email || 'sin email'}</b>{d.original_pet_name ? ` · original: ${d.original_pet_name}` : ''}</span>
                                                <span className="text-[13px]">{formatDate(nItem.created_at)}</span>
                                            </span>
                                            <span className="flex gap-2">
                                                {d.original_user_email ? (
                                                    <Btn icon="mail" variant="dark" href={`mailto:${d.original_user_email}?subject=Posible%20coincidencia%20de%20tu%20mascota%20en%20Mimo`}>Contactar</Btn>
                                                ) : null}
                                                <Btn icon="externalLink" to={`/pet/${d.new_pet_id}`}>Ver match</Btn>
                                                {isUnread ? <Btn icon="check" onClick={() => { markDeletedUserMatchRead(nItem.id); setCounts(c => ({ ...c, alerts: Math.max(0, c.alerts - 1) })); }}>Marcar leída</Btn> : null}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ─── DENUNCIAS ─── */}
                {activeTab === 'reports' && (
                    <>
                        <PageHeader title="Denuncias" sub="Revisá cada caso, mirá la conversación y decidí." />
                        <Note>Denuncias de usuarios y mensajes. Quien denunció ya pudo haber bloqueado a la otra persona. La expulsión aparece recién cuando la denuncia está revisada.</Note>
                        <div className="flex flex-wrap gap-2">
                            {[['pending', 'Pendientes'], ['reviewed', 'Revisadas'], ['dismissed', 'Descartadas'], ['all', 'Todas']].map(([k, label]) => (
                                <button key={k} onClick={() => setReportFilter(k)}
                                    className="flex items-center gap-2 h-10 px-4 rounded-full text-sm font-bold cursor-pointer"
                                    style={reportFilter === k ? { background: C.noche, color: C.crema, border: 'none' } : { background: '#fff', color: C.noche, border: `1px solid ${C.arena}` }}>
                                    {label}<span className="text-xs opacity-80">{reportCounts[k]}</span>
                                </button>
                            ))}
                        </div>
                        {loading ? <Loading /> : visibleReports.length === 0 ? <EmptyCard>No hay denuncias {reportFilter === 'all' ? '' : 'en este estado'}.</EmptyCard> : (
                            <div className="flex flex-col gap-3">
                                {visibleReports.map((r) => {
                                    const pending = r.status === 'pending';
                                    return (
                                        <div key={r.id} className="flex flex-col gap-3.5 p-5 rounded-3xl bg-white" style={{ border: `2px solid ${pending ? C.coral : 'transparent'}` }}>
                                            <div className="flex items-center gap-2">
                                                <Chip color={C.noche} text={C.crema}>{REASON_LABEL[r.reason] || r.reason}</Chip>
                                                <Chip color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Chip>
                                                <span className="ml-auto text-[13px]">{formatDate(r.created_at)}</span>
                                            </div>
                                            <p className="m-0 text-base">
                                                <b>{r.reporter_name}</b> denunció a <b>{r.reported_name}</b>{' '}
                                                <span className="text-sm">· {r.reported_email}</span>
                                                {r.reported_deleted_at ? <span className="ml-2"><Chip color={C.lineaFuerte} text={C.crema}>Cuenta eliminada</Chip></span> : null}
                                            </p>
                                            {r.message_snapshot ? (
                                                <div className="px-4 py-3.5 rounded-2xl text-[15px] leading-[1.45]" style={{ background: C.crema, borderLeft: `4px solid ${C.coral}`, overflowWrap: 'anywhere' }}>
                                                    “{r.message_snapshot}”
                                                </div>
                                            ) : null}
                                            {r.note ? <p className="m-0 text-sm"><b>Nota:</b> {r.note}</p> : null}
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                {r.pet_id ? (
                                                    <Btn icon="messageCircle" onClick={() => fetchConversationMessages({
                                                        pet_id: r.pet_id, user_a_id: r.reporter_id, user_b_id: r.reported_user_id,
                                                        pet_name: null, user_a_name: r.reporter_name, user_b_name: r.reported_name,
                                                    })}>Ver conversación</Btn>
                                                ) : null}
                                                {r.pet_id ? <Btn icon="externalLink" to={`/pet/${r.pet_id}`}>Ver caso</Btn> : null}
                                                {r.message_id ? <Btn icon="trash" variant="danger" onClick={() => deleteReportedMessage(r.message_id, r.id)}>Borrar mensaje</Btn> : null}
                                                {pending ? (
                                                    <>
                                                        <Btn icon="x" onClick={() => updateReportStatus(r.id, 'dismissed')}>Descartar</Btn>
                                                        <Btn icon="check" variant="teal" onClick={() => updateReportStatus(r.id, 'reviewed')}>Marcar revisada</Btn>
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* La expulsión aparece recién con la denuncia revisada:
                                                            primero se mira, después se actúa. Se oculta si la
                                                            cuenta ya fue eliminada. */}
                                                        {r.status === 'reviewed' && r.reported_user_id && !r.reported_deleted_at ? (
                                                            <Btn icon="lock" variant="dangerSolid" onClick={() => banReportedUser(r)}>Eliminar usuario y bloquear email</Btn>
                                                        ) : null}
                                                        <Btn icon="rotateCcw" onClick={() => updateReportStatus(r.id, 'pending')}>Reabrir</Btn>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ─── MODAL DE CONVERSACIÓN (contexto de una denuncia) ───
                Solo se abre desde una denuncia puntual, no hay browse general. */}
            {activeConversation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,26,46,.55)' }} onClick={closeConversation}>
                    <div role="dialog" aria-label="Conversación" className="w-full max-w-[620px] max-h-[85vh] rounded-[28px] bg-white flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3.5 px-6 py-5" style={{ borderBottom: `1px solid ${C.arena}` }}>
                            <span className="w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center" style={{ background: C.arena }}>
                                <AdminIcon name="messageCircle" size={22} />
                            </span>
                            <span className="flex-1 flex flex-col gap-0.5 min-w-0">
                                <b className="font-display font-black text-xl">Caso: {activeConversation.pet_name || `#${activeConversation.pet_id}`}</b>
                                <span className="text-sm truncate">{activeConversation.user_a_name} ↔ {activeConversation.user_b_name}</span>
                            </span>
                            <button onClick={closeConversation} aria-label="Cerrar" className="w-10 h-10 rounded-full border-0 flex items-center justify-center cursor-pointer" style={{ background: C.crema, color: C.noche }}>
                                <AdminIcon name="x" size={20} />
                            </button>
                        </div>
                        <div className="px-6 py-5 flex flex-col gap-3.5 overflow-y-auto">
                            {loadingQuery ? <p className="text-center py-8 text-sm m-0">Cargando…</p>
                                : conversationMessages.length === 0 ? <p className="text-center py-8 text-sm m-0">Sin mensajes en este hilo.</p>
                                : conversationMessages.map(m => {
                                    const mine = String(m.sender_id) === String(activeConversation.user_b_id); // denunciado a la derecha
                                    const flagged = flaggedIds.has(m.id);
                                    return (
                                        <div key={m.id} className={`group flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
                                            <span className="text-xs font-bold">{m.sender_name} · {formatTime(m.created_at)}</span>
                                            <div className={`flex items-center gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className="max-w-[380px] px-3.5 py-3 rounded-[18px] text-[15px] leading-[1.4]"
                                                    style={flagged
                                                        ? { background: 'rgba(255,92,108,.1)', border: `1.5px solid ${C.coral}`, overflowWrap: 'anywhere' }
                                                        : { background: C.crema, overflowWrap: 'anywhere' }}>
                                                    {m.content}
                                                </div>
                                                <span className={flagged ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}>
                                                    <IconBtn icon="trash" title="Borrar mensaje" danger onClick={() => handleDeleteMessage(m.id)} />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                        <div className="flex items-center gap-2.5 px-6 py-3.5 text-[13px]" style={{ background: C.crema }}>
                            <AdminIcon name="info" size={18} />
                            Solo lectura. Los mensajes denunciados se marcan en Coral y se pueden borrar.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Componentes del panel (Admin-*.dc.html) ─────────────────────────────

const C = {
    coral: '#FF5C6C', teal: '#3ECFB2', sol: '#FFB830', violeta: '#9B6DFF',
    noche: '#1A1A2E', noche2: '#262642', linea: '#33334F', lineaFuerte: '#3A3A58',
    crema: '#FFF6F0', arena: '#F0EBE8', lavanda: '#B4B4C6',
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// "mimo" con solo el punto de la i en Coral.
function Wordmark({ size, color }) {
    return (
        <span className="font-display font-extrabold leading-none" style={{ fontSize: size, color }} aria-label="mimo">
            m<span style={{ background: `linear-gradient(to bottom, ${C.coral} 0, ${C.coral} 0.47em, ${color} 0.47em)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>i</span>mo
        </span>
    );
}

function PageHeader({ title, sub }) {
    return (
        <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-display font-black text-[34px] leading-[1.1]">{title}</h1>
            {sub ? <p className="m-0 text-[15px]">{sub}</p> : null}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <section className="flex flex-col gap-3">
            <h2 className="m-0 font-display font-black text-[22px]">{title}</h2>
            {children}
        </section>
    );
}

function Chip({ color, text = C.arena, children }) {
    return (
        <span className="shrink-0 px-2.5 py-[3px] rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: color, color: text }}>
            {children}
        </span>
    );
}

function StatusChip({ status }) {
    return status === 'lost' ? <Chip color={C.coral}>Perdido</Chip> : <Chip color={C.teal}>Encontrado</Chip>;
}

function Metric({ label, value, color, icon, sub, bar }) {
    return (
        <div className="min-w-0 bg-white rounded-[22px] p-[18px] flex flex-col gap-2" style={{ borderTop: `4px solid ${color}` }}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase" style={{ letterSpacing: '.08em' }}>{label}</span>
                <AdminIcon name={icon} size={20} color={color} />
            </div>
            <span className="font-display font-black text-[32px] leading-none whitespace-nowrap">{value}</span>
            {bar != null ? (
                <div className="h-2 rounded-full overflow-hidden" style={{ background: C.arena }}>
                    <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, bar))}%`, background: color }} />
                </div>
            ) : null}
            {sub ? <span className="text-[13px]">{sub}</span> : null}
        </div>
    );
}

function AttentionCard({ icon, color, title, sub, onClick }) {
    return (
        <button onClick={onClick} className="min-w-0 flex items-center gap-3.5 p-4 rounded-[22px] bg-white border-0 cursor-pointer text-left" style={{ color: C.noche }}>
            <span className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center" style={{ background: color }}>
                <AdminIcon name={icon} size={22} color={color === C.noche ? C.crema : C.arena} />
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="font-display font-black text-lg">{title}</span>
                <span className="text-[13px]">{sub}</span>
            </span>
            <AdminIcon name="chevronRight" size={20} />
        </button>
    );
}

function ListCard({ title, onAll, children }) {
    return (
        <div className="min-w-0 bg-white rounded-3xl px-5 pt-5 pb-2.5 flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
                <h2 className="m-0 font-display font-black text-[22px]">{title}</h2>
                {onAll ? <button onClick={onAll} className="border-0 bg-transparent p-0 text-sm font-bold underline cursor-pointer" style={{ color: C.noche }}>Ver todos</button> : null}
            </div>
            {children}
        </div>
    );
}

function ListRow({ to, thumb, title, sub, right }) {
    const inner = (
        <>
            {thumb}
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-bold truncate">{title}</span>
                <span className="text-[13px] truncate">{sub}</span>
            </span>
            {right}
        </>
    );
    const cls = 'flex items-center gap-3 py-2.5 no-underline';
    const style = { borderTop: `1px solid ${C.arena}`, color: C.noche };
    return to ? <Link to={to} className={cls} style={style}>{inner}</Link> : <div className={cls} style={style}>{inner}</div>;
}

function Thumb({ src, size = 44 }) {
    return src ? (
        <img src={src} alt="" className="shrink-0 object-cover" style={{ width: size, height: size, borderRadius: 14 }} />
    ) : (
        <span className="shrink-0 flex items-center justify-center" style={{ width: size, height: size, borderRadius: 14, background: C.arena }}>
            <AdminIcon name="pawPrint" size={size / 2.4} />
        </span>
    );
}

function Initial({ name, color, size = 44, square, text = C.arena }) {
    return (
        <span className="shrink-0 flex items-center justify-center font-display font-black"
            style={{ width: size, height: size, borderRadius: square ? Math.round(size / 3) : '50%', background: color, color: text, fontSize: size * 0.42 }}>
            {(name || '?').charAt(0).toUpperCase()}
        </span>
    );
}

function Empty({ children }) {
    return <p className="m-0 py-3 text-[13px]" style={{ borderTop: `1px solid ${C.arena}` }}>{children}</p>;
}

function EntityCard({ thumb, title, chip, meta, actions }) {
    return (
        <div className="flex flex-wrap items-center gap-[18px] p-5 rounded-3xl bg-white">
            {thumb}
            <span className="flex-1 min-w-[260px] flex flex-col gap-1">
                <span className="flex items-center gap-2.5">
                    <b className="font-display font-black text-[19px]">{title}</b>
                    {chip}
                </span>
                <span className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-sm">
                    {meta.map(([icon, text]) => (
                        <span key={icon + text} className="flex items-center gap-1.5"><AdminIcon name={icon} size={16} />{text}</span>
                    ))}
                </span>
            </span>
            <span className="flex gap-2">{actions}</span>
        </div>
    );
}

function EmptyCard({ children }) {
    return <div className="bg-white rounded-3xl p-8 text-center text-[15px]">{children}</div>;
}

function Loading() {
    return <div className="py-8 text-center text-[15px]">Cargando…</div>;
}

function Note({ icon = 'info', children }) {
    return (
        <p className="m-0 flex items-start gap-2.5 px-4 py-3.5 rounded-[18px] bg-white text-sm leading-[1.45]">
            <AdminIcon name={icon} size={18} className="mt-px" />
            <span>{children}</span>
        </p>
    );
}

function Toolbar({ children }) {
    return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function SearchInput({ value, onChange, placeholder }) {
    return (
        <label className="flex items-center gap-2.5 w-[360px] max-w-full h-12 px-4 box-border rounded-2xl bg-white" style={{ border: `1px solid ${C.arena}` }}>
            <AdminIcon name="search" size={18} />
            <span className="sr-only">{placeholder}</span>
            <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                className="flex-1 min-w-0 border-0 outline-none bg-transparent text-[15px]" style={{ color: C.noche }} />
        </label>
    );
}

// Selector con el look de las pastillas del diseño: un <select> nativo invisible encima.
function SelectPill({ label, value, options, onChange }) {
    const current = options.find(([v]) => v === value)?.[1] ?? value;
    return (
        <span className="relative flex items-center gap-2 h-12 px-3.5 box-border rounded-2xl bg-white text-sm" style={{ border: `1px solid ${C.arena}` }}>
            <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: '.08em' }}>{label}</span>
            <b>{current}</b>
            <AdminIcon name="chevronDown" size={18} />
            <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer">
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
        </span>
    );
}

function Results({ n: count }) {
    return <span className="ml-auto text-[13px] font-bold uppercase" style={{ letterSpacing: '.08em' }}>{Number(count || 0).toLocaleString('es-AR')} resultados</span>;
}

function Table({ head, children }) {
    return (
        <div className="bg-white rounded-3xl overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr>{head.map(h => <th key={h} className="text-left px-4 py-3.5 text-[11px] font-bold uppercase whitespace-nowrap" style={{ letterSpacing: '.08em' }}>{h}</th>)}</tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

function Td({ children }) {
    return <td className="whitespace-nowrap px-4 py-3.5 align-middle" style={{ borderTop: `1px solid ${C.arena}` }}>{children}</td>;
}

function IconBtn({ icon, title, onClick, to, danger }) {
    const cls = 'w-[38px] h-[38px] shrink-0 flex items-center justify-center rounded-xl cursor-pointer p-0';
    const style = danger
        ? { border: 'none', background: 'rgba(255,92,108,.1)', color: C.coral }
        : { border: `1.5px solid ${C.arena}`, background: '#fff', color: C.noche };
    if (to) return <Link to={to} title={title} aria-label={title} className={cls} style={style}><AdminIcon name={icon} size={18} /></Link>;
    return <button onClick={onClick} title={title} aria-label={title} className={cls} style={style}><AdminIcon name={icon} size={18} /></button>;
}

const BTN_STYLES = {
    outline: { border: `1.5px solid ${C.arena}`, background: '#fff', color: C.noche },
    danger: { border: 'none', background: 'rgba(255,92,108,.1)', color: C.coral },
    dangerSolid: { border: 'none', background: C.coral, color: C.arena },
    teal: { border: 'none', background: C.teal, color: C.arena },
    dark: { border: 'none', background: C.noche, color: C.crema },
};

function Btn({ icon, children, onClick, to, href, variant = 'outline' }) {
    const cls = 'flex items-center gap-1.5 h-[38px] px-3.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap no-underline';
    const style = BTN_STYLES[variant];
    const content = <>{icon ? <AdminIcon name={icon} size={18} /> : null}{children}</>;
    if (to) return <Link to={to} className={cls} style={style}>{content}</Link>;
    if (href) return <a href={href} className={cls} style={style}>{content}</a>;
    return <button onClick={onClick} className={cls} style={style}>{content}</button>;
}

function Legend({ items }) {
    return (
        <p className="m-0 flex flex-wrap items-center gap-4 text-[13px]">
            {items.map(([icon, label]) => <span key={label} className="flex items-center gap-1.5"><AdminIcon name={icon} size={16} />{label}</span>)}
        </p>
    );
}

// Paginación: "Mostrando a–b de total" + páginas con elipsis.
function Pager({ pagination, onPage }) {
    const { page, totalPages, total } = pagination;
    if (!total) return null;
    const per = 20;
    const from = (page - 1) * per + 1;
    const to = Math.min(page * per, total);
    const pages = [];
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
        else if (pages[pages.length - 1] !== '…') pages.push('…');
    }
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">Mostrando {from}–{to} de {Number(total).toLocaleString('es-AR')}</span>
            {totalPages > 1 ? (
                <div className="flex gap-1.5">
                    {pages.map((p, i) => p === '…' ? (
                        <span key={`e${i}`} className="w-10 h-10 flex items-center justify-center text-sm font-bold">…</span>
                    ) : (
                        <button key={p} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold cursor-pointer"
                            style={p === page ? { background: C.noche, color: C.crema, border: 'none' } : { background: '#fff', color: C.noche, border: `1px solid ${C.arena}` }}>
                            {p}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default AdminPanel;
