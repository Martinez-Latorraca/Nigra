import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { setCredentials } from '../store/userSlice';
import SocialAuth from '../components/SocialAuth';

// Whitelist de rutas válidas para el ?redirect= post-auth. Evita open-redirect.
const ALLOWED_REDIRECTS = new Set([
    '/app', '/reportar', '/buscar', '/profile',
    '/vets', '/vets/register', '/vets/dashboard',
]);

function safeRedirect(raw) {
    if (!raw) return null;
    // Solo aceptamos paths internos (empiezan con /).
    if (!raw.startsWith('/') || raw.startsWith('//')) return null;
    return ALLOWED_REDIRECTS.has(raw) ? raw : null;
}

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [notVerified, setNotVerified] = useState(false);
    const [resendMsg, setResendMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = safeRedirect(searchParams.get('redirect'));

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setNotVerified(false);
        setResendMsg('');
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                dispatch(setCredentials({ user: data.user, token: data.token }));
                navigate(redirectTo || '/app');
                return;
            }

            if (response.status === 403 && data.code === 'email_not_verified') {
                setNotVerified(true);
                setError('');
                return;
            }
            throw new Error(data.error || 'Credenciales incorrectas');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resendVerification = async () => {
        setResendMsg('Enviando…');
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            setResendMsg('Listo — revisá tu email.');
        } catch {
            setResendMsg('No se pudo reenviar. Probá de nuevo.');
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
                    <p className="text-gray-400 font-medium">Inicia sesión en Mimo para continuar</p>
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

                    {notVerified && (
                        <div className="p-5 bg-amber-50 rounded-2xl text-xs text-amber-800 flex flex-col gap-3">
                            <div className="font-semibold">
                                📬 Tenés que verificar tu email antes de iniciar sesión.
                            </div>
                            <button
                                type="button"
                                onClick={resendVerification}
                                className="rounded-full bg-black text-white font-semibold py-2.5 px-4 hover:bg-gray-800 transition-all"
                            >
                                Reenviar mail de verificación
                            </button>
                            {resendMsg ? <div className="text-center">{resendMsg}</div> : null}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-2 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-full transition-all duration-300 shadow-sm text-lg"
                    >
                        {loading ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>

                    <div className="text-center -mt-2">
                        <Link to="/forgot-password" className="text-xs font-semibold text-gray-400 hover:text-black transition-colors">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                </form>

                <SocialAuth />

                <div className="mt-10 text-center text-sm font-medium text-gray-400">
                    ¿Nuevo en Mimo?{' '}
                    <Link to="/register" className="text-black font-semibold hover:underline">
                        Crea una cuenta
                    </Link>
                </div>
            </div>

            <div className="mt-8 text-[10px] text-gray-300 font-bold tracking-[0.2em] uppercase">
                Comunidad Mimo
            </div>
        </div>
    );
}

export default Login;