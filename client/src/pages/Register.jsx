import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SocialAuth from '../components/SocialAuth';

const ACCOUNT_TYPES = [
    {
        id: 'user',
        emoji: '🐾',
        title: 'Busco / reporto mascotas',
        desc: 'Uso Mimo para encontrar o reportar mascotas y ayudar a la comunidad.',
    },
    {
        id: 'vet',
        emoji: '🏥',
        title: 'Represento una veterinaria',
        desc: 'Quiero publicar mascotas encontradas, recibir alertas y sumarme a la red.',
    },
];

function Register() {
    const [accountType, setAccountType] = useState('user');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registered, setRegistered] = useState(false);

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== passwordConfirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al crear la cuenta');
            }

            // El user quedó con email_verified=false. Le mostramos una pantalla
            // que le pide revisar su email antes de iniciar sesión.
            setRegistered(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (registered) {
        const loginRedirect = accountType === 'vet' ? '/login?redirect=/vets/register' : '/login';
        return (
            <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 font-sans text-gray-900">
                <div className="w-full max-w-[440px] bg-white rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] p-10 border border-gray-100 text-center">
                    <div className="text-5xl mb-4">📬</div>
                    <h2 className="text-3xl font-semibold tracking-tighter text-black mb-3">
                        Revisá tu email.
                    </h2>
                    <p className="text-gray-500 leading-relaxed mb-8">
                        Te mandamos un link a <strong className="text-gray-700">{email}</strong> para
                        confirmar tu cuenta. Después de tocarlo vas a poder iniciar sesión.
                    </p>
                    <Link
                        to={loginRedirect}
                        className="inline-block w-full py-4 bg-black hover:bg-gray-800 text-white font-semibold rounded-full transition-all shadow-sm"
                    >
                        Ir al login
                    </Link>
                    <p className="text-[11px] text-gray-400 mt-6">
                        ¿No te llegó?{' '}
                        <Link to="/verify-email" className="font-semibold text-gray-600 hover:text-black">
                            Reenviar mail
                        </Link>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 font-sans text-gray-900">
            <div className="w-full max-w-[440px] mb-8">
                <Link to="/" className="text-sm font-medium text-gray-400 hover:text-black transition-colors flex items-center gap-1">
                    Volver al inicio
                </Link>
            </div>

            <div className="w-full max-w-[440px] bg-white rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] p-10 border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-semibold tracking-tighter text-black mb-2">Crear cuenta.</h2>
                    <p className="text-gray-400 font-medium leading-tight">Únete a la comunidad de búsqueda y rescate de Mimo</p>
                </div>

                {/* Selector de tipo de cuenta */}
                <div className="mb-6">
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-3 px-1 text-gray-400">
                        Tipo de cuenta
                    </label>
                    <div className="flex flex-col gap-2">
                        {ACCOUNT_TYPES.map((t) => {
                            const active = accountType === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setAccountType(t.id)}
                                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                                        active
                                            ? 'border-black bg-white ring-2 ring-black/5'
                                            : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'
                                    }`}
                                >
                                    <span className="text-2xl">{t.emoji}</span>
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-gray-900">{t.title}</div>
                                        <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</div>
                                    </div>
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 ${
                                            active ? 'border-black bg-black' : 'border-gray-300'
                                        }`}
                                    >
                                        {active ? (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                            </div>
                                        ) : null}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <form onSubmit={handleRegister} className="flex flex-col gap-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest mb-2 px-1 text-gray-400">
                            {accountType === 'vet' ? 'Nombre del responsable' : 'Nombre completo'}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-5 py-4 bg-gray-50 text-gray-900 rounded-2xl border border-transparent focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 outline-none transition-all duration-300 font-medium"
                            placeholder="Nombre y apellido"
                        />
                    </div>

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
                            minLength="6"
                            className="w-full px-5 py-4 bg-gray-50 text-gray-900 rounded-2xl border border-transparent focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 outline-none transition-all duration-300 font-medium"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-widest mb-2 px-1 text-gray-400">Repetir contraseña</label>
                        <input
                            type="password"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            required
                            minLength="6"
                            className={`w-full px-5 py-4 bg-gray-50 text-gray-900 rounded-2xl border transition-all duration-300 font-medium focus:bg-white focus:ring-4 focus:ring-gray-100 outline-none ${
                                passwordConfirm && password !== passwordConfirm
                                    ? 'border-red-300 focus:border-red-400'
                                    : 'border-transparent focus:border-gray-200'
                            }`}
                            placeholder="Escribí la contraseña de nuevo"
                        />
                        {passwordConfirm && password !== passwordConfirm ? (
                            <p className="text-[11px] text-red-500 mt-2 px-1 font-semibold">Las contraseñas no coinciden.</p>
                        ) : null}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-semibold text-center mt-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-4 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-full transition-all duration-300 shadow-sm text-lg"
                    >
                        {loading ? 'Procesando...' : accountType === 'vet' ? 'Crear cuenta y continuar' : 'Crear cuenta'}
                    </button>
                </form>

                {accountType === 'user' ? <SocialAuth /> : null}

                <div className="mt-10 text-center text-sm font-medium text-gray-400">
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login" className="text-black font-semibold hover:underline">
                        Inicia sesión
                    </Link>
                </div>
            </div>

            <div className="mt-8 text-[10px] text-gray-300 font-bold tracking-[0.2em] uppercase">
                Plataforma Mimo • 2026
            </div>
        </div>
    );
}

export default Register;
