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

// Mismos textos que /register para que la experiencia sea coherente sin
// importar por dónde entró la persona.
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
    {
        id: 'shelter',
        emoji: '🏡',
        title: 'Represento un refugio',
        desc: 'Publico mascotas en adopción y las promociono en la plataforma.',
    },
];

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-semibold tracking-tighter text-black mb-2">
                        ¿Cómo vas a usar Mimo?
                    </h2>
                    <p className="text-gray-400 font-medium leading-tight">
                        Elegí el tipo de cuenta. Podés cambiarlo después escribiéndonos.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    {ACCOUNT_TYPES.map((t) => {
                        const active = accountType === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setAccountType(t.id)}
                                disabled={loading}
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
                                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 ${active ? 'border-black bg-black' : 'border-gray-300'}`}>
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

                {isEntity && (
                    <p className="text-xs text-gray-400 leading-relaxed mt-4">
                        Vas a poder completar los datos desde tu perfil. Un administrador
                        revisa la cuenta antes de que aparezca en el directorio.
                    </p>
                )}

                {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

                <button
                    type="button"
                    onClick={handleContinue}
                    disabled={loading}
                    className="w-full mt-6 bg-black text-white rounded-2xl py-4 text-sm font-semibold hover:bg-gray-900 transition-colors disabled:opacity-60"
                >
                    {loading ? 'Guardando...' : 'Continuar'}
                </button>
            </div>
        </div>
    );
}

export default AccountType;
