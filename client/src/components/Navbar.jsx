import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import MimoLogo from './MimoLogo';

function Navbar() {
    const token = useSelector(state => state.user?.token);
    const user = useSelector(state => state.user?.data);
    const messages = useSelector(state => state.inbox.messages);

    // ✨ CÁLCULO EN VIVO: Rápido y sin errores de Slices cruzados
    const unreadCount = messages ? messages.filter(
        msg => !msg.is_read && Number(msg.receiver_id) === Number(user?.id)
    ).length : 0;

    return (
        <nav className="sticky top-0 z-50 bg-mimo-warm/85 backdrop-blur-md border-b border-mimo-muted p-4 md:px-8 flex justify-between items-center transition-all">
            <Link to="/app" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <MimoLogo size={30} color="#FF5C6C" />
                <span
                    className="text-2xl leading-none"
                    style={{ fontFamily: "'Nunito', system-ui, sans-serif", fontWeight: 900, color: '#1A1A2E', letterSpacing: '-0.03em' }}
                >
                    mimo
                </span>
            </Link>

            <div className="flex gap-4 items-center">
                {token ? (
                    <div className="flex items-center gap-4">
                        {user?.role === 'admin' && (
                            <Link to="/admin" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                                Admin
                            </Link>
                        )}
                        {/* El Punto Verde en el Navbar */}
                        <Link to="/profile" className="relative text-sm font-semibold bg-mimo-coral text-white hover:bg-mimo-coralDark px-5 py-2.5 rounded-full transition-all shadow-mimo">
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