import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

function Navbar() {
    const token = useSelector(state => state.user?.token);
    const user = useSelector(state => state.user?.data);
    const messages = useSelector(state => state.inbox.messages);

    // ✨ CÁLCULO EN VIVO: Rápido y sin errores de Slices cruzados
    const unreadCount = messages ? messages.filter(
        msg => !msg.is_read && Number(msg.receiver_id) === Number(user?.id)
    ).length : 0;

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 md:px-8 flex justify-between items-center transition-all">
            <Link to="/" className="text-xl font-semibold tracking-tight text-gray-900 hover:opacity-70 transition-opacity">
                Nigra.
            </Link>

            <div className="flex gap-4 items-center">
                {token ? (
                    <div className="flex items-center gap-4">
                        {/* El Punto Verde en el Navbar */}
                        <Link to="/profile" className="relative text-sm font-medium bg-black text-white hover:bg-gray-800 px-5 py-2.5 rounded-full transition-all shadow-sm">
                            Mi Perfil
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white"></span>
                                </span>
                            )}
                        </Link>
                    </div>
                ) : (
                    <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                        Iniciar Sesión
                    </Link>
                )}
            </div>
        </nav>
    );
}

export default Navbar;