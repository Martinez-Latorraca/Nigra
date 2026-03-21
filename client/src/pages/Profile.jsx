import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// 👇 1. Importamos los hooks de Redux y nuestra acción
import { useSelector, useDispatch } from 'react-redux';
import { markAsReadLocal } from '../store/inboxSlice'; // Ajustá la ruta según dónde creaste la carpeta store
import { clearCredentials } from '../store/userSlice';

function Profile() {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = useSelector(state => state.user.token);
    const user = useSelector(state => state.user.data);

    const messages = useSelector(state => state.inbox.messages);
    const dispatch = useDispatch();

    const unreadCount = messages ? messages.filter(msg => {
        const isUnread = msg.is_read === false || msg.is_read === 'false' || msg.is_read === 0;
        const isForMe = Number(msg.receiver_id) === Number(user?.id);
        return isUnread && isForMe;
    }).length : 0;


    useEffect(() => {
        const fetchReports = async () => {
            if (!token) {
                navigate('/login');
                return;
            }

            try {

                const resReports = await fetch('http://localhost:3000/api/pets/my-reports', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!resReports.ok) throw new Error('Error al sincronizar reportes.');

                const reportsData = await resReports.json();
                setReports(reportsData);
            } catch (error) {
                console.error(error);

            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [navigate]);

    const handleLogout = () => {
        dispatch(clearCredentials());
        navigate('/');
    };

    const handleOpenChat = (msg) => {
        const theOtherGuyId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const theOtherGuyName = msg.sender_id === user.id ? msg.receiver_name : msg.sender_name;


        const event = new CustomEvent('openPetChat', {
            detail: {
                petId: msg.pet_id,
                petPhoto: msg.photo_url,
                reporterName: msg.reporter_name,
                reporterId: msg.reporter_id,
                otherUserId: theOtherGuyId,
                otherUserName: theOtherGuyName
            }
        });

        window.dispatchEvent(event);

        dispatch(markAsReadLocal(msg.pet_id));
    };

    const handleDeleteReport = async (id) => {
        if (!window.confirm('¿Eliminar este registro permanentemente?')) return;
        try {
            const response = await fetch(`http://localhost:3000/api/pets/${id}`, {
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
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Sincronizando Nigra ID</div>
        </div>
    );

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
                            {unreadCount > 0 ? `${unreadCount} Nuevos mensajes` : `${messages.length} Chats activos`}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {messages.length === 0 ? (
                            <div className="py-20 text-center">
                                <p className="text-gray-300 font-medium">No hay actividad reciente.</p>
                            </div>
                        ) : (
                            messages.map(msg => {
                                const displayUserName = msg.sender_id === user.id ? msg.receiver_name : msg.sender_name;

                                const isUnread = msg.is_read === false || msg.is_read === 'false' || msg.is_read === 0;
                                const isForMe = Number(msg.receiver_id) === Number(user?.id);
                                const hasUnread = isUnread && isForMe;


                                return (
                                    <div
                                        key={msg.pet_id}
                                        onClick={() => handleOpenChat(msg)}
                                        className="group flex gap-6 items-start p-6 hover:bg-gray-50 rounded-[32px] transition-all border border-transparent hover:border-gray-100 cursor-pointer relative"
                                    >
                                        {/* Foto de la Mascota */}
                                        <div className={`w-14 h-14 bg-gray-100 rounded-2xl flex-shrink-0 overflow-hidden shadow-sm transition-transform duration-500 group-hover:scale-105 ${hasUnread ? 'ring-2 ring-green-500/50' : ''}`}>
                                            <img src={msg.photo_url} className="w-full h-full object-cover" alt="pet" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap mb-1">
                                                <div className='flex flex-col w-full sm:w-1/2 lg:w-1/2 justify-between items-start gap-1 ' >
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${hasUnread ? 'text-green-600' : 'text-gray-400'}`}>
                                                        {hasUnread ? 'Nuevo mensaje' : (displayUserName || 'Consulta')}
                                                    </span>
                                                    <p className={`text-sm leading-relaxed truncate pr-8 ${hasUnread ? 'text-black font-semibold' : 'text-gray-500 font-medium'}`}>
                                                        {msg.sender_id === user.id && <span className="text-gray-400 font-normal">Tú: </span>}
                                                        {msg.content}
                                                    </p>
                                                </div>
                                                <div className='flex flex-col w-full sm:w-1/2 lg:w-1/2 justify-around items-end text-right gap-1 '>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                        {new Date(msg.created_at).toLocaleDateString()}
                                                    </span>
                                                    {hasUnread > 0 && (
                                                        <div className="z-10">
                                                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Flecha sutil al final */}
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
                            <p className="text-7xl font-semibold tracking-tighter">{reports.length}</p>
                        </div>
                        <Link to="/reportar" className="w-full bg-white text-black py-4 rounded-full font-semibold text-center text-sm hover:bg-gray-200 transition-all">
                            Nuevo reporte
                        </Link>
                    </div>

                    <div className="bg-white rounded-[40px] p-8 border border-gray-100 flex-1 min-h-[150px] flex flex-col justify-center">
                        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-2 text-center">Estado del sistema</p>
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-semibold text-gray-900 tracking-tight">Red Nigra Activa</span>
                        </div>
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
                                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${report.status === 'lost' ? 'text-red-500' : 'text-gray-400'}`}>
                                        {report.status === 'lost' ? 'Buscando' : 'Registrado'}
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
                </div>

            </div>

            {/* Footer sutil */}
            <div className="mt-20 text-[10px] text-gray-300 font-bold tracking-[0.3em] uppercase">
                Nigra Identity Service
            </div>
        </div>
    );
}

export default Profile;