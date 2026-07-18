import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

export default function VerifyEmail() {
    const [params] = useSearchParams();
    const token = params.get('token');
    const [status, setStatus] = useState('loading'); // loading | ok | error | expired
    const [errorMsg, setErrorMsg] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMsg('Falta el token en la URL.');
            return;
        }
        fetch(`${API}/api/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        })
            .then(async (r) => {
                const data = await r.json();
                if (r.ok) {
                    setStatus('ok');
                } else {
                    setStatus('expired');
                    setErrorMsg(data.error || 'El link ya expiró o no es válido.');
                }
            })
            .catch(() => {
                setStatus('error');
                setErrorMsg('No pudimos verificar tu email. Probá de nuevo.');
            });
    }, [token]);

    const handleResend = async (e) => {
        e.preventDefault();
        setResending(true);
        setResendMsg('');
        try {
            await fetch(`${API}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resendEmail }),
            });
            setResendMsg('Si el email existe y no está verificado, te enviamos un nuevo link.');
        } catch {
            setResendMsg('Algo salió mal. Probá de nuevo.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 font-sans text-gray-900">
            <div className="w-full max-w-[440px] bg-white rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] p-10 border border-gray-100 text-center">
                {status === 'loading' && (
                    <>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 animate-pulse mb-3">
                            Verificando
                        </div>
                        <div className="text-2xl font-semibold text-black">Un segundo…</div>
                    </>
                )}
                {status === 'ok' && (
                    <>
                        <div className="text-5xl mb-4">✅</div>
                        <h2 className="text-3xl font-semibold tracking-tighter text-black mb-3">Email verificado.</h2>
                        <p className="text-gray-500 leading-relaxed mb-8">
                            Ya podés iniciar sesión en Mimo.
                        </p>
                        <Link
                            to="/login"
                            className="inline-block w-full py-4 bg-black hover:bg-gray-800 text-white font-semibold rounded-full transition-all shadow-sm"
                        >
                            Iniciar sesión
                        </Link>
                    </>
                )}
                {(status === 'error' || status === 'expired') && (
                    <>
                        <div className="text-5xl mb-4">⚠️</div>
                        <h2 className="text-3xl font-semibold tracking-tighter text-black mb-3">
                            {status === 'expired' ? 'Link vencido' : 'Algo falló'}
                        </h2>
                        <p className="text-gray-500 leading-relaxed mb-6">{errorMsg}</p>
                        <form onSubmit={handleResend} className="text-left">
                            <label className="block text-xs font-semibold uppercase tracking-widest mb-2 px-1 text-gray-400">
                                Reenviar mail de verificación
                            </label>
                            <input
                                type="email"
                                required
                                value={resendEmail}
                                onChange={(e) => setResendEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-100 outline-none font-medium"
                            />
                            <button
                                type="submit"
                                disabled={resending}
                                className="w-full mt-3 py-4 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-full transition-all shadow-sm"
                            >
                                {resending ? 'Enviando…' : 'Enviar link nuevo'}
                            </button>
                            {resendMsg ? (
                                <p className="text-[12px] text-gray-500 mt-3 text-center">{resendMsg}</p>
                            ) : null}
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
