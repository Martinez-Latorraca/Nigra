// Pregunta el tipo de cuenta UNA sola vez, después del primer login social.
//
// Por qué existe: /register tiene el selector y hasta oculta los botones
// sociales cuando elegís veterinaria o refugio. Pero el login social es un
// segundo camino de alta que no pasa por ahí — el proveedor devuelve nombre y
// mail, nada más — así que quien entraba por "Continuar con Google" quedaba
// como particular sin forma de convertirse.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserData } from '../store/userSlice';
import { AuthLayout, AuthTitle, PrimaryButton, Notice, AccountTypePicker } from '../components/AuthLayout';

function AccountType() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const token = useSelector((s) => s.user.token);
    const [accountType, setAccountType] = useState('user');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleContinue = async () => {
        setError('');
        // Particular no crea nada: es el estado por defecto de la cuenta.
        if (accountType === 'user') {
            navigate('/app');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/account-type`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ account_type: accountType }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo guardar el tipo de cuenta.');

            dispatch(updateUserData({
                has_vet: !!data.has_vet,
                has_shelter: !!data.has_shelter,
                vet_approved: false,
                shelter_approved: false,
            }));
            // Al perfil: ahí completa los datos de la entidad mientras espera
            // la aprobación del admin.
            navigate('/profile');
        } catch (e) {
            setError(e.message);
            setLoading(false);
        }
    };

    const isEntity = accountType === 'vet' || accountType === 'shelter';

    return (
        <AuthLayout>
            <AuthTitle title="¿Cómo vas a usar Mimo?" subtitle="Elegí el tipo de cuenta. Podés cambiarlo después escribiéndonos." />

            <AccountTypePicker value={accountType} onChange={setAccountType} disabled={loading} />

            {isEntity && (
                <p className="m-0 text-sm leading-normal">
                    Vas a poder completar los datos desde tu perfil. Un administrador revisa la cuenta antes de que aparezca en el directorio.
                </p>
            )}

            {error && <Notice tone="error">{error}</Notice>}

            <PrimaryButton type="button" onClick={handleContinue} disabled={loading}>
                {loading ? 'Guardando…' : 'Continuar'}
            </PrimaryButton>
        </AuthLayout>
    );
}

export default AccountType;
