import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { setCredentials } from '../store/userSlice';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                dispatch(setCredentials({
                    user: data.user,
                    token: data.token
                }));
            } else {
                throw new Error(data.error || 'Credenciales incorrectas');
            }

            navigate('/reportar');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 font-sans text-gray-900">

            {/* Botón Volver sutil */}
            <div className="w-full max-w-[400px] mb-8">
                <Link to="/" className="text-sm font-medium text-gray-400 hover:text-black transition-colors flex items-center gap-1">
                    Volver al inicio
                </Link>
            </div>

            <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] p-10 border border-gray-100">
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-semibold tracking-tighter text-black mb-2">Bienvenido.</h2>
                    <p className="text-gray-400 font-medium">Inicia sesión en Nigra para continuar</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest mb-2 px-1 text-gray-400">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-5 py-4 bg-gray-50 text-gray-900 rounded-2xl border border-transparent focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 outline-none transition-all duration-300 font-medium"
                            placeholder="nombre@ejemplo.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest mb-2 px-1 text-gray-400">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-5 py-4 bg-gray-50 text-gray-900 rounded-2xl border border-transparent focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 outline-none transition-all duration-300 font-medium"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-semibold text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-2 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-full transition-all duration-300 shadow-sm text-lg"
                    >
                        {loading ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-10 text-center text-sm font-medium text-gray-400">
                    ¿Nuevo en Nigra?{' '}
                    <Link to="/register" className="text-black font-semibold hover:underline">
                        Crea una cuenta
                    </Link>
                </div>
            </div>

            <div className="mt-8 text-[10px] text-gray-300 font-bold tracking-[0.2em] uppercase">
                Seguridad Encriptada Nigra
            </div>
        </div>
    );
}

export default Login;