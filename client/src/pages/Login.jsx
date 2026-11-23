import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { setCredentials } from '../store/userSlice';
import SocialAuth from '../components/SocialAuth';
import { AuthLayout, AuthTitle, Field, PrimaryButton, Notice, AuthFooterLink } from '../components/AuthLayout';

// Whitelist de rutas válidas para el ?redirect= post-auth. Evita open-redirect.
const ALLOWED_REDIRECTS = new Set([
    '/app', '/reportar', '/buscar', '/profile',
    '/vets', '/vets/register',
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
    const [accountDeleted, setAccountDeleted] = useState(false);
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
        setAccountDeleted(false);
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
                if (redirectTo) {
                    navigate(redirectTo);
                } else if (data.user?.has_shelter) {
                    // Refugios (aprobados o no) van directo a su panel.
                    navigate('/profile');
                } else if (data.user?.has_vet && !data.user.vet_approved) {
                    navigate('/profile');
                } else {
                    navigate('/app');
                }
                return;
            }

            if (response.status === 403 && data.code === 'email_not_verified') {
                setNotVerified(true);
                return;
            }
            if (response.status === 403 && data.code === 'account_deleted') {
                setAccountDeleted(true);
                return;
            }
            throw new Error(data.error || 'Email o contraseña incorrectos.');
        } catch (err) {
            setError(err.message === 'Failed to fetch' ? 'No pudimos conectarnos. Probá de nuevo en un rato.' : err.message);
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
            setResendMsg('Listo: revisá tu email.');
        } catch {
            setResendMsg('No se pudo reenviar. Probá de nuevo.');
        }
    };

    return (
        <AuthLayout>
            <AuthTitle title="Bienvenido" subtitle="Iniciá sesión en Mimo" />

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <Field
                    label="Email"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="nombre@ejemplo.com"
                />
                <div className="flex flex-col gap-3">
                    <Field
                        label="Contraseña"
                        icon={Lock}
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Tu contraseña"
                    />
                    <Link to="/forgot-password" className="self-end text-sm font-bold underline hover:text-mimo-coral">
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                {error && <Notice tone="error">{error}</Notice>}

                {notVerified && (
                    <Notice>
                        <span>Tenés que verificar tu email antes de iniciar sesión. Revisá tu casilla (y la carpeta de spam).</span>
                        <button type="button" onClick={resendVerification} className="self-start font-bold underline hover:text-mimo-coral">
                            Reenviar mail de verificación
                        </button>
                        {resendMsg && <span className="font-bold">{resendMsg}</span>}
                    </Notice>
                )}

                {/* Login-eliminada: la cuenta se recupera registrándose con el mismo email. */}
                {accountDeleted && (
                    <Notice>
                        <span>Esta cuenta fue eliminada. Podés recuperarla creándola de nuevo con este mismo email: tus reportes y datos vuelven.</span>
                        <Link to="/register" className="self-start font-bold underline hover:text-mimo-coral">Crear la cuenta de nuevo</Link>
                    </Notice>
                )}

                <PrimaryButton type="submit" disabled={loading}>
                    {loading ? 'Entrando…' : 'Iniciar sesión'}
                </PrimaryButton>
            </form>

            <SocialAuth />

            <AuthFooterLink text="¿Nuevo en Mimo?" to="/register" linkText="Crear cuenta" />
        </AuthLayout>
    );
}

export default Login;
