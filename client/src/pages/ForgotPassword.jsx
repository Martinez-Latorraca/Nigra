import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, MailCheck } from 'lucide-react';
import { AuthLayout, AuthTitle, Field, PrimaryButton, PrimaryLink, Notice, StateIcon } from '../components/AuthLayout';
import { C } from '../utils/theme';

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
            setError(err.message === 'Failed to fetch' ? 'No pudimos conectarnos. Probá de nuevo en un rato.' : err.message);
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <AuthLayout>
                <StateIcon icon={MailCheck} color={C.teal} />
                <AuthTitle
                    title="Revisá tu casilla"
                    subtitle={<>Si <b>{email}</b> está registrado en Mimo, te mandamos un link para elegir una contraseña nueva. Puede tardar un par de minutos.</>}
                />
                <PrimaryLink to="/login">Volver al login</PrimaryLink>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <StateIcon icon={KeyRound} color={C.coral} />
            <AuthTitle title="Recuperar cuenta" subtitle="Te mandamos un link para reiniciar tu contraseña." />
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                {error && <Notice tone="error">{error}</Notice>}
                <PrimaryButton type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar link'}</PrimaryButton>
            </form>
            <Link to="/login" className="self-center text-[15px] font-bold underline hover:text-mimo-coral">Volver al login</Link>
        </AuthLayout>
    );
}

export default ForgotPassword;
