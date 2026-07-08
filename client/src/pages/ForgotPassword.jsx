import { useState } from 'react';
import { Link } from 'react-router-dom';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No pudimos procesar tu pedido.');
            setSent(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 font-sans text-gray-900">
            <div className="w-full max-w-[400px] mb-8">
                <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-black transition-colors">
                    Volver al login
                </Link>
            </div>

            <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] p-10 border border-gray-100">
                {sent ? (
                    <div className="text-center">
                        <h2 className="text-3xl font-semibold tracking-tighter text-black mb-3">Revisá tu casilla.</h2>
                        <p className="text-gray-400 font-medium leading-relaxed mb-8">
                            Si <span className="text-black font-semibold">{email}</span> está registrado en Mimo, te vamos a enviar un link para elegir una nueva contraseña. Puede tardar un par de minutos.
                        </p>
                        <Link
                            to="/login"
                            className="inline-block w-full py-4 bg-black hover:bg-gray-800 text-white font-semibold rounded-full transition-all duration-300 text-lg"
                        >
                            Volver al login
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-10">
                            <h2 className="text-4xl font-semibold tracking-tighter text-black mb-2">Recuperar cuenta.</h2>
                            <p className="text-gray-400 font-medium">Ingresá tu email y te mandamos un link para reiniciar tu contraseña.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
                                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default ForgotPassword;
