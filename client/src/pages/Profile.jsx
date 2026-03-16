import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Profile() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Recuperamos los datos del usuario que guardamos en el login
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
        const confirmDelete = window.confirm('🚨 ¡ATENCIÓN! ¿Estás seguro de que quieres eliminar tu cuenta permanentemente? Se borrarán todos tus reportes. Esta acción NO se puede deshacer.');

        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem('petFinderToken');
            // Aquí le pegaremos a una futura ruta de tu backend
            const response = await fetch('http://localhost:3000/api/auth/me', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al eliminar la cuenta en el servidor');

            alert('Tu cuenta ha sido eliminada. Lamentamos verte partir. 🐾');
            handleLogout(); // Borramos el token y lo mandamos al inicio
        } catch (err) {
            alert('Aviso: ' + err.message + ' (Falta crear la ruta DELETE /api/auth/me en el backend)');
            // Solo para pruebas en el frontend, lo deslogueamos igual
            handleLogout();
        }
    };

    const handleDeleteReport = async (id) => {
        const confirmDelete = window.confirm('¿Eliminar este reporte?');
        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem('petFinderToken');
            const response = await fetch(`http://localhost:3000/api/pets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al eliminar');
            setReports(reports.filter(report => report.id !== id));
            alert('Reporte eliminado con éxito 🎉');
        } catch (err) {
            alert('Aviso: ' + err.message + ' (Falta crear la ruta DELETE en el backend)');
        }
    };

    if (loading) return <div className="text-center mt-20 font-bold text-pet-dark">Cargando tu perfil... ⏳</div>;

    return (
        <div className="min-h-screen bg-pet-light p-4 md:p-8 font-sans text-pet-dark flex flex-col items-center">

            {/* 1. TARJETA DE USUARIO */}
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-md p-6 sm:p-8 mb-8 flex flex-col sm:flex-row justify-between items-center gap-6 border-t-8 border-pet-primaryDark">
                <div className="text-center sm:text-left">
                    <h2 className="text-3xl font-extrabold text-pet-primaryDark mb-1">
                        Hola, {userData.name || 'Usuario'} 👋
                    </h2>
                    <p className="text-gray-500">{userData.email || 'tu@email.com'}</p>
                </div>

                <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleLogout}
                        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-pet-dark font-bold rounded-xl transition-colors text-sm"
                    >
                        🚪 Cerrar Sesión
                    </button>
                    <button
                        onClick={handleDeleteAccount}
                        className="px-6 py-2 bg-red-100 text-red-600 hover:bg-red-200 font-bold rounded-xl transition-colors text-sm"
                    >
                        ⚠️ Eliminar Cuenta
                    </button>
                </div>
            </div>

            {/* 2. SECCIÓN DE MIS REPORTES */}
            <div className="w-full max-w-3xl flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-pet-dark">Mis Reportes</h3>
                <Link to="/reportar" className="text-sm bg-pet-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-pet-primaryDark transition-colors shadow-sm">
                    + Nuevo
                </Link>
            </div>

            {error && (
                <div className="w-full max-w-3xl mb-6 p-4 bg-yellow-100 text-yellow-800 rounded-xl text-sm text-center border border-yellow-200">
                    ⚠️ {error}
                </div>
            )}

            <div className="w-full max-w-3xl flex flex-col gap-4">
                {reports.length === 0 ? (
                    <div className="text-center bg-white p-10 rounded-3xl shadow-sm border border-gray-200">
                        <p className="text-gray-500 mb-4">Aún no has subido ningún reporte.</p>
                    </div>
                ) : (
                    reports.map(report => (
                        <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col sm:flex-row items-center p-4 gap-4">
                            <img
                                src={report.photo_url}
                                alt="Mascota"
                                className="w-24 h-24 object-cover rounded-xl border border-gray-100"
                            />
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="font-bold text-lg text-pet-primaryDark">
                                    {report.name !== 'Desconocido' ? report.name : 'Sin nombre'}
                                </h3>
                                <p className="text-sm text-gray-500 capitalize">
                                    {report.type === 'dog' ? '🐶 Perro' : '🐱 Gato'} • {report.color}
                                </p>
                                <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-md text-white font-bold ${report.status === 'lost' ? 'bg-pet-accent' : 'bg-pet-primary'}`}>
                                    {report.status === 'lost' ? 'Perdido' : 'Encontrado'}
                                </span>
                            </div>
                            <button
                                onClick={() => handleDeleteReport(report.id)}
                                className="w-full sm:w-auto px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 font-bold rounded-xl text-sm transition-colors"
                            >
                                🗑️ Eliminar
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Profile;