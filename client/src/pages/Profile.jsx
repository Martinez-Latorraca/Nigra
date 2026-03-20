import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Profile() {
    const [reports, setReports] = useState([]);
    const [messages, setMessages] = useState([]); // Nuevo estado para la bandeja
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const userData = JSON.parse(localStorage.getItem('petFinderUser') || '{}');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('petFinderToken');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                // Ejecutamos ambas peticiones en paralelo para mayor velocidad
                const [resReports, resMessages] = await Promise.all([
                    fetch('http://localhost:3000/api/pets/my-reports', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    // fetch('http://localhost:3000/api/pets/messages', { // Asegúrate de tener esta ruta en tu backend
                    //     headers: { 'Authorization': `Bearer ${token}` }
                    // })
                ]);

                if (!resReports.ok) throw new Error('Error al sincronizar reportes.');

                const reportsData = await resReports.json();
                setReports(reportsData);

                // if (resMessages.ok) {
                //     const messagesData = await resMessages.json();
                //     setMessages(messagesData);
                // }

            } catch (error) {
                console.error(error);
                setError('No se pudo sincronizar toda la información.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('petFinderToken');
        localStorage.removeItem('petFinderUser');
        navigate('/');
    };

    const handleDeleteReport = async (id) => {
        if (!window.confirm('¿Eliminar este registro permanentemente?')) return;
        try {
            const token = localStorage.getItem('petFinderToken');
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

            {/* --- HERO SECTION: TITULAR APPLE STYLE --- */}
            <div className="w-full max-w-5xl pt-16 pb-12 px-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 block">Mi Cuenta</span>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <h1 className="text-6xl md:text-8xl font-semibold tracking-tighter text-black">
                        {userData.name?.split(' ')[0] || 'Usuario'}.
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

                {/* BLOQUE 1: BANDEJA DE MENSAJES (Ocupa 2 columnas) */}
                <div className="md:col-span-2 bg-white rounded-[40px] p-8 md:p-10 shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-gray-100">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-semibold tracking-tight">Bandeja de entrada.</h2>
                        <span className="bg-black text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                            {messages.length} Notificaciones
                        </span>
                    </div>

                    <div className="space-y-4">
                        {messages.length === 0 ? (
                            <div className="py-20 text-center">
                                <p className="text-gray-300 font-medium">No hay actividad reciente.</p>
                            </div>
                        ) : (
                            messages.map(msg => (
                                <div key={msg.id} className="group flex gap-6 items-start p-6 hover:bg-gray-50 rounded-[32px] transition-all border border-transparent hover:border-gray-100">
                                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex-shrink-0 overflow-hidden">
                                        <img src={msg.photo_url} className="w-full h-full object-cover" alt="pet" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Mensaje de rescate</span>
                                            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Hace un momento</span>
                                        </div>
                                        <p className="text-gray-900 font-medium text-sm leading-relaxed mb-3">
                                            "{msg.content}"
                                        </p>
                                        <a href={`tel:${msg.contact_info}`} className="text-[11px] font-bold text-black bg-gray-100 px-4 py-1.5 rounded-full uppercase tracking-tight hover:bg-black hover:text-white transition-all">
                                            Contactar: {msg.contact_info}
                                        </a>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* BLOQUE 2: RESUMEN Y ACCIÓN (Columna lateral) */}
                <div className="flex flex-col gap-6">
                    {/* Card de métricas rápida */}
                    <div className="bg-black rounded-[40px] p-8 text-white flex flex-col justify-between h-64 shadow-xl">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-50 mb-2">Reportes activos</p>
                            <p className="text-7xl font-semibold tracking-tighter">{reports.length}</p>
                        </div>
                        <Link to="/reportar" className="w-full bg-white text-black py-4 rounded-full font-semibold text-center text-sm hover:bg-gray-200 transition-all">
                            Nuevo reporte
                        </Link>
                    </div>

                    {/* Card secundaria sutil */}
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