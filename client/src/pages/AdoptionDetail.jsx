import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior', unknown: 'Sin dato' };
const SEX_LABEL = { male: 'Macho', female: 'Hembra', unknown: 'Sin dato' };

function Chip({ children }) {
    return (
        <span className="rounded-full bg-mimo-muted px-3 py-1 text-[11px] font-semibold text-mimo-ink">
            {children}
        </span>
    );
}

export default function AdoptionDetail() {
    const { id } = useParams();
    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activePhoto, setActivePhoto] = useState(0);

    useEffect(() => {
        setLoading(true);
        fetch(`${API}/api/adoption-pets/${id}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not_found'))))
            .then((data) => setPet(data))
            .catch(() => setError('No pudimos encontrar esta publicación.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-mimo-muted">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet animate-pulse">
                    Cargando
                </div>
            </div>
        );
    }

    if (error || !pet) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-mimo-muted p-6 text-center">
                <h1 className="mb-4 font-display font-black text-6xl text-mimo-noche">404.</h1>
                <p className="mb-10 text-mimo-ink">{error}</p>
                <Link to="/adoptions" className="rounded-full bg-mimo-coral px-8 py-3 text-sm font-display font-extrabold uppercase tracking-widest text-white hover:bg-mimo-coralDark shadow-mimo">
                    Volver a adopciones
                </Link>
            </div>
        );
    }

    const photos = Array.isArray(pet.photos) ? pet.photos : [];
    const adopted = !!pet.adopted_at;
    const whatsappHref = pet.shelter_whatsapp
        ? `https://wa.me/${String(pet.shelter_whatsapp).replace(/[^\d]/g, '')}?text=Hola,%20me%20interesa%20adoptar%20a%20${encodeURIComponent(pet.name || 'esta mascota')}`
        : null;

    return (
        <div className="min-h-screen bg-mimo-muted pb-20 font-sans text-mimo-noche">
            <div className="mx-auto w-full max-w-5xl px-6 pt-10">
                <Link to="/adoptions" className="text-xs font-semibold text-mimo-quiet hover:text-mimo-noche">
                    ← Volver a adopciones
                </Link>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
                    {/* Galería */}
                    <div>
                        <div className="relative aspect-[4/3] rounded-[32px] overflow-hidden bg-mimo-warm">
                            {photos[activePhoto] ? (
                                <img src={photos[activePhoto]} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-6xl">🐾</div>
                            )}
                            {adopted ? (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="rounded-full bg-mimo-coral px-5 py-2 text-sm font-display font-extrabold uppercase tracking-widest text-white">
                                        Ya fue adoptado
                                    </span>
                                </div>
                            ) : null}
                        </div>
                        {photos.length > 1 ? (
                            <div className="mt-4 flex gap-3 overflow-x-auto">
                                {photos.map((url, i) => (
                                    <button
                                        key={url}
                                        onClick={() => setActivePhoto(i)}
                                        className={`h-20 w-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                                            i === activePhoto ? 'border-mimo-noche' : 'border-transparent opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        <img src={url} alt="" className="h-full w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {/* Info */}
                    <div className="space-y-6">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">
                                En adopción
                            </span>
                            <h1 className="mt-2 font-display font-black text-5xl tracking-tight text-mimo-noche">
                                {pet.name || 'Sin nombre'}.
                            </h1>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Chip>{SPECIES_LABEL[pet.species]}</Chip>
                            {pet.size ? <Chip>{SIZE_LABEL[pet.size]}</Chip> : null}
                            {pet.age_group && pet.age_group !== 'unknown' ? <Chip>{AGE_LABEL[pet.age_group]}</Chip> : null}
                            {pet.sex && pet.sex !== 'unknown' ? <Chip>{SEX_LABEL[pet.sex]}</Chip> : null}
                            {pet.color ? <Chip>{pet.color}</Chip> : null}
                            {pet.vaccinated ? <Chip>💉 Vacunado</Chip> : null}
                            {pet.neutered ? <Chip>✂️ Castrado</Chip> : null}
                        </div>

                        {pet.description ? (
                            <div className="rounded-[24px] border border-mimo-muted bg-mimo-warm p-6">
                                <p className="whitespace-pre-line text-sm leading-relaxed text-mimo-ink">
                                    {pet.description}
                                </p>
                            </div>
                        ) : null}

                        {/* Refugio */}
                        <div className="rounded-[24px] border border-mimo-muted bg-mimo-warm p-6">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-mimo-quiet">
                                Refugio
                            </span>
                            <Link
                                to={`/shelters/${pet.shelter_slug}`}
                                className="mt-2 flex items-center gap-3 group"
                            >
                                {pet.shelter_logo ? (
                                    <img src={pet.shelter_logo} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                                ) : (
                                    <div className="h-12 w-12 rounded-2xl bg-mimo-coral flex items-center justify-center text-white font-bold text-xl">
                                        {pet.shelter_name.charAt(0)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-display font-black text-base text-mimo-noche truncate group-hover:underline">
                                        {pet.shelter_name}
                                    </div>
                                    {pet.shelter_city ? (
                                        <div className="text-[11px] text-mimo-quiet font-medium">📍 {pet.shelter_city}</div>
                                    ) : null}
                                </div>
                            </Link>

                            {!adopted ? (
                                <div className="mt-5 space-y-2">
                                    {whatsappHref ? (
                                        <a
                                            href={whatsappHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 rounded-full bg-mimo-noche py-3 text-sm font-display font-extrabold uppercase tracking-widest text-white hover:bg-mimo-noche/85"
                                        >
                                            💬 Contactar por WhatsApp
                                        </a>
                                    ) : null}
                                    {pet.shelter_email ? (
                                        <a
                                            href={`mailto:${pet.shelter_email}?subject=Consulta%20por%20adopci%C3%B3n%20-%20${encodeURIComponent(pet.name || 'mascota')}`}
                                            className="flex items-center justify-center gap-2 rounded-full border border-mimo-muted bg-mimo-warm py-3 text-sm font-bold text-mimo-ink hover:bg-mimo-muted"
                                        >
                                            ✉️ Escribir por email
                                        </a>
                                    ) : null}
                                    {pet.shelter_phone ? (
                                        <a
                                            href={`tel:${pet.shelter_phone}`}
                                            className="flex items-center justify-center gap-2 rounded-full border border-mimo-muted bg-mimo-warm py-3 text-sm font-bold text-mimo-ink hover:bg-mimo-muted"
                                        >
                                            📞 Llamar
                                        </a>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
