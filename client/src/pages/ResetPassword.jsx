import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la contraseña.');
            setDone(true);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 font-sans text-gray-900">
                <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] p-10 border border-gray-100 text-center">
                    <h2 className="text-3xl font-semibold tracking-tighter text-black mb-3">Link inválido.</h2>
                    <p className="text-gray-400 font-medium mb-8">
                        El link de recuperación no es válido o está incompleto. Pedí uno nuevo.
                    </p>
                    <Link
                        to="/forgot-password"
                        className="inline-block w-full py-4 bg-black hover:bg-gray-800 text-white font-semibold rounded-full transition-all duration-300 text-lg"
                    >
                        Pedir nuevo link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 font-sans text-gray-900">
            <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] p-10 border border-gray-100">
                {done ? (
                    <div className="text-center">
                        <h2 className="text-3xl font-semibold tracking-tighter text-black mb-3">¡Listo! 🎉</h2>
                        <p className="text-gray-400 font-medium leading-relaxed mb-8">
                            Actualizamos tu contraseña. Te vamos a llevar al login en un instante...
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-10">
                            <h2 className="text-4xl font-semibold tracking-tighter text-black mb-2">Nueva contraseña.</h2>
                            <p className="text-gray-400 font-medium">Elegí una nueva contraseña para tu cuenta.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
                                <label className="block text-xs font-semibold uppercase tracking-widest mb-2 px-1 text-gray-400">Confirmar contraseña</label>
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    required
                                    className="w-full px-5 py-4 bg-gray-50 text-gray-900 rounded-2xl border border-transparent focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 outline-none transition-all duration-300 font-medium"
                                    placeholder="Repetí tu contraseña"
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-semibold text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 mt-2 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-full transition-all duration-300 shadow-sm text-lg"
                            >
                                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default ResetPassword;
