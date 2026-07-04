import { useDispatch } from 'react-redux';
import { markDismissedTemp, markDismissedPermanent } from '../store/donationSlice';

const MP_URL = 'https://link.mercadopago.com.uy/mimouy';

// Banner que aparece en el chat exitoso después de que el dueño marca la
// mascota como reunida. Ofrece un CTA a Mercado Pago + dismissal (temp / "ya doné").
function DonationBanner({ petId, petName }) {
    const dispatch = useDispatch();

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
