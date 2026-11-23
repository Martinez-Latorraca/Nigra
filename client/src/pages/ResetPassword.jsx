import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CircleCheck, CircleAlert } from 'lucide-react';
import { AuthLayout, AuthTitle, Field, PrimaryButton, PrimaryLink, Notice, StateIcon } from '../components/AuthLayout';
import { C } from '../utils/theme';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const mismatch = confirm && password !== confirm;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
            setError('La contraseña tiene que tener al menos 6 caracteres.');
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
            setError(err.message === 'Failed to fetch' ? 'No pudimos conectarnos. Probá de nuevo en un rato.' : err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <AuthLayout>
                <StateIcon icon={CircleAlert} color={C.coral} />
                <AuthTitle title="Link inválido" subtitle="El link de recuperación no es válido o está incompleto. Pedí uno nuevo." />
                <PrimaryLink to="/forgot-password">Pedir un link nuevo</PrimaryLink>
            </AuthLayout>
        );
    }

    if (done) {
        return (
            <AuthLayout>
                <StateIcon icon={CircleCheck} color={C.teal} />
                <AuthTitle title="¡Listo!" subtitle="Actualizamos tu contraseña. Te llevamos al login en un instante." />
                <PrimaryLink to="/login">Ir al login</PrimaryLink>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <StateIcon icon={Lock} color={C.coral} />
            <AuthTitle title="Nueva contraseña" subtitle="Elegí una contraseña nueva para tu cuenta." />
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <Field
                    label="Contraseña nueva"
                    icon={Lock}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                />
                <Field
                    label="Repetir contraseña"
                    icon={Lock}
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repetí la contraseña"
                    error={mismatch ? 'No coinciden.' : ''}
                />
                {error && <Notice tone="error">{error}</Notice>}
                <PrimaryButton type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar contraseña'}</PrimaryButton>
            </form>
        </AuthLayout>
    );
}

export default ResetPassword;
