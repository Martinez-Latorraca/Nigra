import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock, MailCheck, FileText } from 'lucide-react';
import SocialAuth from '../components/SocialAuth';
import {
    AuthLayout, AuthTitle, Field, PrimaryButton, PrimaryLink, Notice, StateIcon, AccountTypePicker, AuthFooterLink,
} from '../components/AuthLayout';
import { C } from '../utils/theme';
import { CONTACT_EMAIL, mailtoContact } from '../utils/links';

function Register() {
    const [accountType, setAccountType] = useState('user');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registered, setRegistered] = useState(false);
    // `restored` = la cuenta ya existía soft-deleted y la reactivamos.
    const [restored, setRestored] = useState(false);

    const mismatch = passwordConfirm && password !== passwordConfirm;
    const isEntity = accountType === 'vet' || accountType === 'shelter';

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
                body: JSON.stringify({ name, email, password, account_type: accountType }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se pudo crear la cuenta.');

            // Un register puede ser un signup nuevo o el restore de una cuenta
            // borrada; en los dos casos se confirma el email.
            setRestored(!!data.restored);
            setRegistered(true);
        } catch (err) {
            setError(err.message === 'Failed to fetch' ? 'No pudimos conectarnos. Probá de nuevo en un rato.' : err.message);
        } finally {
            setLoading(false);
        }
    };

    if (registered) {
        return (
            <AuthLayout>
                <StateIcon icon={MailCheck} color={C.teal} />
                <AuthTitle
                    title={restored ? 'Recuperando tu cuenta' : 'Revisá tu email'}
                    subtitle={restored
                        ? <>Te mandamos un link a <b>{email}</b> para confirmar que sos vos. Al tocarlo, tus reportes y datos vuelven intactos.</>
                        : <>Te mandamos un link a <b>{email}</b> para confirmar tu cuenta. Después de tocarlo vas a poder iniciar sesión.</>}
                />

                {accountType === 'shelter' && !restored && (
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-white text-sm leading-[1.5]">
                        <FileText size={20} strokeWidth={2} className="shrink-0 text-mimo-teal mt-px" />
                        <div className="flex flex-col gap-2">
                            <b className="text-[15px]">Un paso más</b>
                            <span>
                                Para publicar mascotas en adopción tenés que verificar que representás a un refugio o protectora.
                                Mandá a <a href={mailtoContact('Verificación de refugio Mimo')} className="font-bold underline">{CONTACT_EMAIL}</a> los
                                comprobantes que tengas (papeles de la ONG, cuenta bancaria a nombre del refugio, redes sociales)
                                desde el email de tu cuenta.
                            </span>
                            <span>Mientras tanto podés editar el perfil del refugio. Cuando un admin lo apruebe, ya podés publicar.</span>
                        </div>
                    </div>
                )}

                <PrimaryLink to="/login">Ir al login</PrimaryLink>
                <AuthFooterLink text="¿No te llegó?" to="/verify-email" linkText="Reenviar mail" />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <AuthTitle title="Crear cuenta" subtitle="Unite a la comunidad de búsqueda y rescate de Mimo" />

            <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold tracking-[.08em] uppercase">Tipo de cuenta</span>
                <AccountTypePicker value={accountType} onChange={setAccountType} disabled={loading} />
            </div>

            <form onSubmit={handleRegister} className="flex flex-col gap-5">
                <Field
                    label={isEntity ? 'Nombre del responsable' : 'Nombre completo'}
                    icon={User}
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Nombre y apellido"
                />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <Field
                        label="Contraseña"
                        icon={Lock}
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Mínimo 6"
                    />
                    <Field
                        label="Repetir"
                        icon={Lock}
                        type="password"
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Repetí la contraseña"
                        error={mismatch ? 'No coinciden.' : ''}
                    />
                </div>

                {error && <Notice tone="error">{error}</Notice>}

                <PrimaryButton type="submit" disabled={loading}>
                    {loading ? 'Creando la cuenta…' : isEntity ? 'Crear cuenta y continuar' : 'Crear cuenta'}
                </PrimaryButton>
            </form>

            {/* Vets y refugios se registran con email: el login social no pregunta el tipo. */}
            {accountType === 'user' && <SocialAuth />}

            <AuthFooterLink text="¿Ya tenés cuenta?" to="/login" linkText="Iniciar sesión" />
        </AuthLayout>
    );
}

export default Register;
