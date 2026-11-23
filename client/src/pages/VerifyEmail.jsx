import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, MailCheck, MailX, LoaderCircle } from 'lucide-react';
import { AuthLayout, AuthTitle, Field, PrimaryButton, PrimaryLink, Notice, StateIcon } from '../components/AuthLayout';
import { C } from '../utils/theme';

const API = import.meta.env.VITE_API_URL || '';

export default function VerifyEmail() {
    const [params] = useSearchParams();
    const token = params.get('token');
    // Sin token (p. ej. "Reenviar mail" desde el registro) va directo al reenvío.
    const [status, setStatus] = useState(token ? 'loading' : 'resend'); // loading | ok | expired | error | resend
    const [errorMsg, setErrorMsg] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState('');

    useEffect(() => {
        if (!token) return;
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
                    setErrorMsg(data.error || 'El link ya venció o no es válido.');
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
            setResendMsg('Si el email existe y no está verificado, te mandamos un link nuevo.');
        } catch {
            setResendMsg('Algo salió mal. Probá de nuevo.');
        } finally {
            setResending(false);
        }
    };

    if (status === 'loading') {
        return (
            <AuthLayout>
                <span className="w-[72px] h-[72px] rounded-[22px] bg-white flex items-center justify-center">
                    <LoaderCircle size={34} strokeWidth={2} className="animate-spin" />
                </span>
                <AuthTitle title="Verificando tu email…" subtitle="Un segundo." />
            </AuthLayout>
        );
    }

    if (status === 'ok') {
        return (
            <AuthLayout>
                <StateIcon icon={MailCheck} color={C.teal} />
                <AuthTitle title="¡Email verificado!" subtitle="Tu cuenta ya está activa. Ya podés iniciar sesión." />
                <PrimaryLink to="/login">Ir al login</PrimaryLink>
            </AuthLayout>
        );
    }

    const titles = {
        expired: ['Link vencido', errorMsg],
        error: ['Algo falló', errorMsg],
        resend: ['Reenviar mail', 'Escribí tu email y te mandamos otro link para verificar la cuenta.'],
    };
    const [title, subtitle] = titles[status];

    return (
        <AuthLayout>
            <StateIcon icon={status === 'resend' ? Mail : MailX} color={C.coral} />
            <AuthTitle title={title} subtitle={subtitle} />
            <form onSubmit={handleResend} className="flex flex-col gap-5">
                <Field
                    label="Email"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                />
                <PrimaryButton type="submit" disabled={resending}>{resending ? 'Enviando…' : 'Enviar link nuevo'}</PrimaryButton>
                {resendMsg && <Notice>{resendMsg}</Notice>}
            </form>
        </AuthLayout>
    );
}
