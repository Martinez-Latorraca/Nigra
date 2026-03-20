import { Link, useLocation } from 'react-router-dom';

function Navbar() {
    const location = useLocation();
    const token = localStorage.getItem('petFinderToken');

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 md:px-8 flex justify-between items-center transition-all">

            {/* ¡Nuevo nombre de la app con el punto minimalista! */}
            <Link to="/" className="text-xl font-semibold tracking-tight text-gray-900 hover:opacity-70 transition-opacity">
                Nigra.
            </Link>

            <div className="flex gap-4 items-center">
                {token ? (
                    <Link
                        to="/profile"
                        className="text-sm font-medium bg-black text-white hover:bg-gray-800 px-5 py-2.5 rounded-full transition-all shadow-sm"
                    >
                        Mi Perfil
                    </Link>
                ) : (
                    location.pathname !== '/login' && location.pathname !== '/registro' && (
                        <Link
                            to="/login"
                            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            Iniciar Sesión
                        </Link>
                    )
                )}
            </div>
        </nav>
    );
}

export default Navbar;