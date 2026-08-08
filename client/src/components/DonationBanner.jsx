import { useDispatch, useSelector } from 'react-redux';
import { markDismissedTemp, markDismissedPermanent } from '../store/donationSlice';
import { MP_DONATION_URL as MP_URL } from '../utils/links';

const API = import.meta.env.VITE_API_URL || '';

// Banner que aparece en el chat exitoso después de que el dueño marca la
// mascota como reunida. Ofrece un CTA a Mercado Pago + dismissal (temp / "ya doné").
function DonationBanner({ petId, petName }) {
    const dispatch = useDispatch();
    const token = useSelector((s) => s.user?.token);

    // Fire-and-forget: registra el click antes de abrir MP. keepalive permite
    // que el request sobreviva a la navegación de la nueva pestaña. Nunca
    // bloquea la apertura del link (no await, no preventDefault).
    const trackClick = () => {
        try {
            fetch(`${API}/api/donations/click`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ pet_id: petId ?? null }),
                keepalive: true,
            }).catch(() => {});
        } catch { /* noop */ }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-black mb-2">
                {petName ? `${petName} ya está en casa 🐾` : '¡Reencuentro exitoso! 🐾'}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Mimo se banca con lo que la comunidad aporta. Si te ayudó, un cafecito nos deja seguir conectando familias.
            </p>
            <a
                href={MP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackClick}
                className="block w-full text-center bg-black text-white py-3 rounded-full font-semibold text-sm hover:bg-gray-800 transition-colors"
            >
                Donar por Mercado Pago
            </a>
            <div className="flex justify-between mt-4">
                <button
                    onClick={() => dispatch(markDismissedTemp(petId))}
                    className="text-xs font-semibold text-gray-400 hover:text-black underline transition-colors"
                >
                    Ahora no
                </button>
                <button
                    onClick={() => dispatch(markDismissedPermanent(petId))}
                    className="text-xs font-semibold text-gray-400 hover:text-black underline transition-colors"
                >
                    Ya doné
                </button>
            </div>
        </div>
    );
}

export default DonationBanner;
