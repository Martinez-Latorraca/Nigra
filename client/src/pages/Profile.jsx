import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Profile() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const userData = JSON.parse(localStorage.getItem('petFinderUser') || '{}');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMyReports = async () => {
            const token = localStorage.getItem('petFinderToken');
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/pets/my-reports', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('No pudimos conectar con el servidor.');

                const data = await response.json();
                setReports(data);
            } catch (err) {
                console.error(err);
                setError('Mostrando datos de prueba. Faltan las rutas en el backend.');
                setReports([
                    { id: 1, name: 'Morocha', status: 'lost', type: 'dog', color: 'black', photo_url: 'https://via.placeholder.com/300' }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchMyReports();
    }, [navigate]);

    // --- FUNCIONES DE ACCIÓN ---

    const handleLogout = () => {
        localStorage.removeItem('petFinderToken');
        localStorage.removeItem('petFinderUser');
        navigate('/');
    };

    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm('¿Estás seguro de que quieres eliminar tu cuenta permanentemente? Se borrarán todos tus reportes. Esta acción no se puede deshacer.');

        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem('petFinderToken');
            const response = await fetch('http://localhost:3000/api/auth/me', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al eliminar la cuenta en el servidor');

            alert('Tu cuenta ha sido eliminada.');
            handleLogout();
        } catch (err) {
            alert('Aviso: ' + err.message + ' (Falta crear la ruta DELETE /api/auth/me en el backend)');
            handleLogout();
        }
    };

    const handleDeleteReport = async (id) => {
        const confirmDelete = window.confirm('¿Eliminar este reporte permanentemente?');
        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem('petFinderToken');
            const response = await fetch(`http://localhost:3000/api/pets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al eliminar');
            setReports(reports.filter(report => report.id !== id));
        } catch (err) {
            alert('Aviso: ' + err.message + ' (Falta crear la ruta DELETE en el backend)');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
            <div className="text-sm font-medium text-gray-400 tracking-wide animate-pulse">Cargando perfil...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 font-sans text-gray-900 flex flex-col items-center">

            {/* 1. TARJETA DE USUARIO */}
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-8 mb-8 flex flex-col sm:flex-row justify-between items-center gap-8 border border-gray-100">
                <div className="text-center sm:text-left">
                    <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-1">
                        Hola, {userData.name || 'Usuario'}
                    </h2>
                    <p className="text-gray-500 font-medium">{userData.email || 'tu@email.com'}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleLogout}
                        className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-full transition-all text-sm"
                    >
                        Cerrar Sesión
                    </button>
                    <button
                        onClick={handleDeleteAccount}
                        className="px-6 py-2.5 bg-transparent hover:bg-red-50 text-red-500 font-medium rounded-full transition-all text-sm"
                    >
                        Eliminar Cuenta
                    </button>
                </div>
            </div>

            {/* 2. SECCIÓN DE MIS REPORTES */}
            <div className="w-full max-w-3xl flex justify-between items-center mb-6 px-2">
                <h3 className="text-2xl font-semibold tracking-tight text-gray-900">Mis Reportes</h3>
                <Link to="/reportar" className="text-sm bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-all shadow-sm">
                    Nuevo Reporte
                </Link>
            </div>

            {error && (
                <div className="w-full max-w-3xl mb-6 p-4 bg-gray-50 text-gray-600 rounded-2xl text-sm text-center border border-gray-200 font-medium">
                    {error}
                </div>
            )}

            <div className="w-full max-w-3xl flex flex-col gap-4">
                {reports.length === 0 ? (
                    <div className="text-center bg-transparent py-16">
                        <p className="text-gray-400 font-medium">Aún no has subido ningún reporte.</p>
                    </div>
                ) : (
                    reports.map(report => (
                        <div key={report.id} className="bg-white rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 p-5 flex flex-col sm:flex-row items-center gap-6 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                            <img
                                src={report.photo_url}
                                alt="Mascota"
                                className="w-28 h-28 object-cover rounded-2xl bg-gray-50"
                            />
                            <div className="flex-1 text-center sm:text-left flex flex-col justify-center">
                                <h3 className="font-semibold text-xl tracking-tight text-gray-900 mb-1">
                                    {report.name || report.description || 'Sin nombre'}
                                </h3>
                                <p className="text-sm text-gray-500 capitalize font-medium mb-3">
                                    {report.type === 'dog' ? 'Perro' : 'Gato'} • {report.color}
                                </p>
                                <div>
                                    <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${report.status === 'lost' ? 'bg-gray-100 text-gray-700' : 'bg-green-50 text-green-700'}`}>
                                        {report.status === 'lost' ? 'Perdido' : 'Encontrado'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteReport(report.id)}
                                className="w-full sm:w-auto px-5 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 font-medium rounded-full text-sm transition-all"
                            >
                                Eliminar
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Profile;