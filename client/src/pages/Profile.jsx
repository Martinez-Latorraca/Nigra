import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// 👇 1. Importamos los hooks de Redux y nuestra acción
import { useSelector, useDispatch } from 'react-redux';
import { clearCredentials } from '../store/userSlice';
import { openChat } from '../store/chatSlice';
import { markNotificationRead } from '../store/notificationsSlice';
import LinkedAccounts from '../components/LinkedAccounts';

function Profile() {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportsPage, setReportsPage] = useState(1);
    const [reportsTotalPages, setReportsTotalPages] = useState(1);
    const [reportsTotal, setReportsTotal] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [notifyNearby, setNotifyNearby] = useState(false);
    const [savingToggle, setSavingToggle] = useState(false);

    const token = useSelector(state => state.user.token);
    const user = useSelector(state => state.user.data);

    const messages = useSelector(state => state.inbox.messages);
    const notifList = useSelector(state => state.notifications.list);
    const dispatch = useDispatch();

    // Mergeamos chats y matches en una sola lista ordenada por recency,
    // igual que el mobile inbox.
    const items = useMemo(() => {
        const chats = (messages || []).map(m => ({
            kind: 'chat',
            key: `chat-${m.pet_id}-${m.other_user_id}`,
            sortDate: m.created_at,
            ...m,
        }));
        const matches = (notifList || [])
            .filter(n => n.type === 'match')
            .map(n => ({
                kind: 'match',
                key: `match-${n.id}`,
                sortDate: n.created_at,
                ...n,
            }));
        return [...chats, ...matches].sort(
            (a, b) => new Date(b.sortDate) - new Date(a.sortDate)
        );
    }, [messages, notifList]);

    const unreadChatCount = messages ? messages.filter(msg => {
        const isUnread = msg.is_read === false || msg.is_read === 'false' || msg.is_read === 0;
        const isForMe = Number(msg.receiver_id) === Number(user?.id);
        return isUnread && isForMe;
    }).length : 0;
    const unreadMatchCount = (notifList || []).filter(n => n.type === 'match' && !n.read_at).length;
    const unreadCount = unreadChatCount + unreadMatchCount;


    const fetchReports = async (pageNum = 1, append = false) => {
        if (!token) {
            navigate('/login');
            return;
        }
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const resReports = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/my-reports?page=${pageNum}&limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resReports.ok) throw new Error('Error al sincronizar reportes.');

            const data = await resReports.json();
            setReports(prev => append ? [...prev, ...data.reports] : data.reports);
            setReportsPage(data.page);
            setReportsTotalPages(data.totalPages);
            setReportsTotal(data.total);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Hidratamos el estado del toggle de alertas cerca desde el server.
    useEffect(() => {
        if (!token) return;
        fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setNotifyNearby(!!data.notify_nearby); })
            .catch(() => {});
    }, [token]);

    const handleToggleNotify = async () => {
        const next = !notifyNearby;
        setNotifyNearby(next); // optimistic
        setSavingToggle(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/notify-nearby`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: next }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setNotifyNearby(!next); // rollback
        } finally {
            setSavingToggle(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [navigate, token]);

    const handleLogout = () => {
        dispatch(clearCredentials());
        navigate('/');
    };


    const handleOpenChat = (msg) => {
        dispatch(openChat({
            pet_id: msg.pet_id,
            petPhoto: msg.photo_url,
            otherUserId: msg.other_user_id,
            otherUserName: msg.other_user_name
        }));
    };

    const handleOpenMatch = (item) => {
        if (!item.read_at) dispatch(markNotificationRead(item.id));
        const petId = item.data?.pet_id;
        if (petId) navigate(`/pet/${petId}`);
    };

    const handleDeleteReport = async (id) => {
        if (!window.confirm('¿Eliminar este registro permanentemente?')) return;
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al eliminar');
            setReports(reports.filter(report => report.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };


    if (loading) return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Sincronizando Mimo ID</div>
        </div>
    );

    // Si el user hizo logout desde este mismo Profile, el estado de Redux se
    // limpia ANTES de que el navigate('/') tenga efecto; sin este guard el
    // render intermedio revienta con "Cannot read properties of null".
    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#F5F5F7] pb-20 font-sans text-gray-900 flex flex-col items-center">

            {/* --- HERO SECTION --- */}
            <div className="w-full max-w-5xl pt-16 pb-12 px-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 block">Mi Cuenta</span>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <h1 className="text-6xl md:text-8xl font-semibold tracking-tighter text-black">
                        {user.name || 'Usuario'}.
                    </h1>
                    <div className="flex gap-6 pb-2">
                        <button onClick={handleLogout} className="text-sm font-medium text-gray-400 hover:text-black transition-colors">
                            Cerrar sesión
                        </button>
                        <button className="text-sm font-medium text-red-500 hover:opacity-70 transition-opacity">
                            Eliminar datos
                        </button>
                    </div>
                </div>
            </div>

            {/* --- BENTO GRID --- */}
            <div className="w-full max-w-5xl px-6 grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* BLOQUE 1: BANDEJA DE MENSAJES */}
                <div className="md:col-span-2 bg-white rounded-[40px] p-8 md:p-10 shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-gray-100">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-semibold tracking-tight text-black">Bandeja de entrada.</h2>
                        {/* 👇 5. Usamos el unreadCount de Redux para la etiqueta */}
                        <span className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest transition-all ${unreadCount > 0 ? 'bg-green-500 text-white animate-pulse' : 'bg-pet-primary text-white'}`}>
                            {unreadCount > 0 ? `${unreadCount} Nuevos` : `${items.length} Activos`}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {items.length === 0 ? (
                            <div className="py-20 text-center">
                                <p className="text-gray-300 font-medium">No hay actividad reciente.</p>
                            </div>
                        ) : (
                            items.map(item => {
                                if (item.kind === 'chat') {
                                    const isUnread = item.is_read === false || item.is_read === 'false' || item.is_read === 0;
                                    const isForMe = Number(item.receiver_id) === Number(user?.id);
                                    const hasUnread = isUnread && isForMe;

                                    return (
                                        <div
                                            key={item.key}
                                            onClick={() => handleOpenChat(item)}
                                            className="group flex gap-6 items-start p-6 hover:bg-gray-50 rounded-[32px] transition-all border border-transparent hover:border-gray-100 cursor-pointer relative"
                                        >
                                            <div className={`w-14 h-14 bg-gray-100 rounded-2xl flex-shrink-0 overflow-hidden shadow-sm transition-transform duration-500 group-hover:scale-105 ${hasUnread ? 'ring-2 ring-green-500/50' : ''}`}>
                                                <img src={item.photo_url} className="w-full h-full object-cover" alt="pet" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap mb-1">
                                                    <div className='flex flex-col w-full sm:w-1/2 lg:w-1/2 justify-between items-start gap-1 ' >
                                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${hasUnread ? 'text-green-600' : 'text-gray-400'}`}>
                                                            {hasUnread ? 'Nuevo mensaje' : (item.other_user_name || 'Consulta')}
                                                        </span>
                                                        <p className={`text-sm leading-relaxed truncate pr-8 ${hasUnread ? 'text-black font-semibold' : 'text-gray-500 font-medium'}`}>
                                                            {item.sender_id === user.id ? <span className="text-gray-400 font-normal">Tú: </span> : <span className="text-gray-400 font-normal">El/Ella: </span>}
                                                            {item.content}
                                                        </p>
                                                    </div>
                                                    <div className='flex flex-col w-full sm:w-1/2 lg:w-1/2 justify-around items-end text-right gap-1 '>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                            {new Date(item.created_at).toLocaleDateString()}
                                                        </span>
                                                        {hasUnread && (
                                                            <div className="z-10">
                                                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="self-center text-gray-200 group-hover:text-black transition-colors">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                            </div>
                                        </div>
                                    );
                                }

                                // kind === 'match'
                                const hasUnread = !item.read_at;
                                const photo = item.data?.photo_url;
                                return (
                                    <div
                                        key={item.key}
                                        onClick={() => handleOpenMatch(item)}
                                        className="group flex gap-6 items-start p-6 hover:bg-gray-50 rounded-[32px] transition-all border border-transparent hover:border-gray-100 cursor-pointer relative"
                                    >
                                        <div className={`w-14 h-14 bg-gray-100 rounded-2xl flex-shrink-0 overflow-hidden shadow-sm transition-transform duration-500 group-hover:scale-105 ${hasUnread ? 'ring-2 ring-blue-500/50' : ''}`}>
                                            {photo ? <img src={photo} className="w-full h-full object-cover" alt="posible match" /> : null}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap mb-1">
                                                <div className='flex flex-col w-full sm:w-1/2 lg:w-1/2 justify-between items-start gap-1 '>
                                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">
                                                        Posible coincidencia
                                                    </span>
                                                    <p className={`text-sm leading-relaxed truncate pr-8 ${hasUnread ? 'text-black font-semibold' : 'text-gray-500 font-medium'}`}>
                                                        Reportaron una mascota similar{item.data?.match_name ? ` a ${item.data.match_name}` : ''}. ¿Es la tuya?
                                                    </p>
                                                </div>
                                                <div className='flex flex-col w-full sm:w-1/2 lg:w-1/2 justify-around items-end text-right gap-1 '>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </span>
                                                    {hasUnread && (
                                                        <div className="z-10">
                                                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="self-center text-gray-200 group-hover:text-black transition-colors">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* BLOQUE 2: RESUMEN Y ACCIÓN */}
                <div className="flex flex-col gap-6">
                    <div className="bg-black rounded-[40px] p-8 text-white flex flex-col justify-between h-64 shadow-xl">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-50 mb-2">Reportes activos</p>
                            <p className="text-7xl font-semibold tracking-tighter">{reportsTotal}</p>
                        </div>
                        <Link to="/reportar" className="w-full bg-white text-black py-4 rounded-full font-semibold text-center text-sm hover:bg-gray-200 transition-all">
                            Nuevo reporte
                        </Link>
                    </div>

                    <div className="bg-white rounded-[40px] p-8 border border-gray-100 flex-1 min-h-[150px] flex flex-col justify-center">
                        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-2 text-center">Estado del sistema</p>
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-semibold text-gray-900 tracking-tight">Comunidad Mimo Activa</span>
                        </div>
                    </div>

                    <LinkedAccounts />

                    <div className="bg-white rounded-[40px] p-8 border border-gray-100 flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 tracking-tight mb-1">Alertas de mascotas cerca</p>
                            <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                Te avisamos cuando reporten una mascota perdida o encontrada a menos de 5 km tuyo.
                            </p>
                        </div>
                        <button
                            onClick={handleToggleNotify}
                            disabled={savingToggle}
                            aria-pressed={notifyNearby}
                            className={`shrink-0 relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${notifyNearby ? 'bg-pet-primary' : 'bg-gray-200'} disabled:opacity-50`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${notifyNearby ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* --- SECCIÓN INFERIOR: MIS REGISTROS --- */}
                <div className="md:col-span-3 mt-8">
                    <div className="px-2 mb-8">
                        <h3 className="text-2xl font-semibold tracking-tight text-black">Mis registros.</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                        {reports.map(report => (
                            <div key={report.id} className="group bg-white rounded-[32px] p-4 flex items-center gap-6 border border-gray-100 transition-all hover:shadow-[0_15px_30px_rgba(0,0,0,0.04)]">
                                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                                    <img src={report.photo_url} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" alt="pet" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${report.resolved_at ? 'text-blue-500' : report.status === 'lost' ? 'text-red-500' : 'text-gray-400'}`}>
                                        {report.resolved_at ? 'Reencontrada ✓' : report.status === 'lost' ? 'Buscando' : 'Registrado'}
                                    </p>
                                    <h4 className="font-semibold text-gray-900 truncate tracking-tight text-lg leading-tight mb-2">
                                        {report.description || 'Sin descripción'}
                                    </h4>
                                    <button
                                        onClick={() => handleDeleteReport(report.id)}
                                        className="text-[10px] font-bold text-gray-300 hover:text-red-500 uppercase tracking-widest transition-colors"
                                    >
                                        Eliminar registro
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {reportsPage < reportsTotalPages && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={() => fetchReports(reportsPage + 1, true)}
                                disabled={loadingMore}
                                className="px-10 py-4 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingMore ? 'Cargando...' : `Cargar más (${reportsPage} de ${reportsTotalPages})`}
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* Footer sutil */}
            <div className="mt-20 text-[10px] text-gray-300 font-bold tracking-[0.3em] uppercase">
                Mimo Identity Service
            </div>
        </div>
    );
}

export default Profile;