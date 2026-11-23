import { useSelector } from 'react-redux';
import { Link, NavLink } from 'react-router-dom';
import { Bell, Shield } from 'lucide-react';
import Wordmark from './Wordmark';
import { C } from '../utils/theme';

const LINKS = [
    ['/pets', 'Explorar'],
    ['/adoptions', 'Adopciones'],
    ['/shelters', 'Refugios'],
    ['/vets', 'Veterinarias'],
];

const pill = ({ isActive }) =>
    `flex items-center h-10 px-4 rounded-full text-[15px] font-bold whitespace-nowrap transition-colors ${
        isActive ? 'bg-mimo-noche text-mimo-warm' : 'text-mimo-noche hover:bg-mimo-muted'
    }`;

function Navbar() {
    const token = useSelector(state => state.user?.token);
    const user = useSelector(state => state.user?.data);
    const messages = useSelector(state => state.inbox.messages);
    const notifications = useSelector(state => state.notifications?.list);

    // Punto Coral en la campana: mensajes o alertas sin leer.
    const unreadMessages = messages
        ? messages.filter(msg => !msg.is_read && Number(msg.receiver_id) === Number(user?.id)).length
        : 0;
    const unreadAlerts = notifications ? notifications.filter(n => !n.read_at).length : 0;
    const hasUnread = unreadMessages + unreadAlerts > 0;
    const initial = (user?.name || '').trim().charAt(0).toUpperCase() || 'M';

    return (
        <nav aria-label="Principal" className="sticky top-0 z-50 bg-mimo-warm border-b border-mimo-muted">
            <div className="flex items-center justify-between h-[76px] px-4 md:px-12">
                <Link to="/app" className="hover:opacity-80 transition-opacity">
                    <Wordmark size={28} />
                </Link>

                <div className="hidden lg:flex gap-1">
                    {LINKS.map(([to, label]) => (
                        <NavLink key={to} to={to} className={pill}>{label}</NavLink>
                    ))}
                </div>

                <div className="flex items-center gap-2.5">
                    {token ? (
                        <>
                            {user?.role === 'admin' && (
                                <Link
                                    to="/admin"
                                    className="hidden sm:flex items-center gap-1.5 h-10 px-3.5 rounded-full border-[1.5px] border-mimo-muted text-sm font-bold text-mimo-noche hover:bg-white transition-colors"
                                >
                                    <Shield size={16} strokeWidth={2} />
                                    Admin
                                </Link>
                            )}
                            <Link
                                to="/profile"
                                aria-label="Notificaciones"
                                className="relative w-11 h-11 rounded-full bg-white flex items-center justify-center"
                            >
                                <Bell size={20} strokeWidth={2} color={C.noche} />
                                {hasUnread && (
                                    <span className="absolute top-[9px] right-[10px] flex h-[9px] w-[9px]">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mimo-coral opacity-60" />
                                        <span className="relative inline-flex h-[9px] w-[9px] rounded-full bg-mimo-coral ring-2 ring-white" />
                                    </span>
                                )}
                            </Link>
                            <Link
                                to="/profile"
                                className="flex items-center gap-2 h-11 pl-1.5 pr-4 rounded-full bg-mimo-coral hover:bg-mimo-coralDark text-mimo-muted text-[15px] font-bold transition-colors"
                            >
                                <span className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center font-display font-black">
                                    {initial}
                                </span>
                                Mi perfil
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="flex items-center h-10 px-4 rounded-full text-[15px] font-bold text-mimo-noche hover:bg-mimo-muted transition-colors">
                                Iniciar sesión
                            </Link>
                            <Link to="/register" className="hidden sm:flex items-center h-11 px-5 rounded-full bg-mimo-coral hover:bg-mimo-coralDark text-mimo-muted text-[15px] font-bold transition-colors">
                                Crear cuenta
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* En pantallas chicas los links van en una fila que se desliza. */}
            <div className="lg:hidden flex gap-1 overflow-x-auto px-4 pb-3 -mt-1">
                {LINKS.map(([to, label]) => (
                    <NavLink key={to} to={to} className={pill}>{label}</NavLink>
                ))}
            </div>
        </nav>
    );
}

export default Navbar;
