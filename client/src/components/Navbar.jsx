import { Link, useLocation } from 'react-router-dom';

function Navbar() {
    const location = useLocation();
    const token = localStorage.getItem('petFinderToken');

    return (
        <nav className="bg-pet-primaryDark p-4 shadow-md text-white flex justify-between items-center z-50 relative">
            <Link to="/" className="text-xl font-extrabold tracking-tight hover:text-pet-light transition-colors flex items-center gap-2">
                🕵️ Pet Finder
            </Link>

            <div className="flex gap-4 items-center">
                {token ? (
                    <Link to="/perfil" className="text-sm font-bold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors flex items-center gap-2">
                        👤 Mi Perfil
                    </Link>
                ) : (
                    location.pathname !== '/login' && location.pathname !== '/registro' && (
                        <Link to="/login" className="text-sm font-bold hover:text-pet-light transition-colors">
                            Iniciar Sesión
                        </Link>
                    )
                )}
            </div>
        </nav>
    );
}

export default Navbar;