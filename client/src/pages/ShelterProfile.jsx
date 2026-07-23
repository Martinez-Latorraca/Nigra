import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const HOURS_ORDER = [
    ['mon', 'Lunes'], ['tue', 'Martes'], ['wed', 'Miércoles'],
    ['thu', 'Jueves'], ['fri', 'Viernes'], ['sat', 'Sábado'], ['sun', 'Domingo'],
];

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };

function ContactRow({ icon, label, value, href }) {
    if (!value) return null;
    const content = (
        <div className="flex items-center gap-3 rounded-2xl border border-mimo-muted bg-mimo-warm px-4 py-3">
            <span className="text-lg">{icon}</span>
            <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold uppercase tracking-widest text-mimo-quiet">{label}</div>
                <div className="truncate text-sm font-semibold text-mimo-noche">{value}</div>
            </div>
        </div>
    );
    if (!href) return content;
    return <a href={href} target="_blank" rel="noopener noreferrer" className="block">{content}</a>;
}

function PetMiniCard({ pet }) {
    const photo = pet.photos?.[0];
    const adopted = !!pet.adopted_at;
    return (
        <Link to={`/adoptions/${pet.id}`} className="group block rounded-[20px] overflow-hidden bg-mimo-warm border border-mimo-muted">
            <div className="relative aspect-square bg-mimo-muted">
                {photo ? (
                    <img src={photo} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">🐾</div>
                )}
                {adopted ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-[9px] font-display font-extrabold uppercase tracking-widest text-white">Adoptado</span>
                    </div>
                ) : null}
            </div>
            <div className="p-3">
                <div className="text-sm font-display font-black text-mimo-noche truncate">{pet.name || 'Sin nombre'}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-mimo-quiet">{SPECIES_LABEL[pet.species]}</div>
            </div>
        </Link>
    );
}

export default function ShelterProfile() {
    const { slug } = useParams();
    const [shelter, setShelter] = useState(null);
    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        fetch(`${API}/api/shelters/${slug}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not_found'))))
            .then((data) => {
                setShelter(data);
                // Segundo fetch: adopciones activas del refugio.
                return fetch(`${API}/api/adoption-pets?shelter_id=${data.id}&limit=12`);
            })
            .then((r) => r?.ok ? r.json() : { pets: [] })
            .then((d) => setPets(d.pets || []))
            .catch(() => setError('No pudimos encontrar este refugio.'))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-mimo-muted">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet animate-pulse">Cargando</div>
            </div>
        );
    }

    if (error || !shelter) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-mimo-muted p-6 text-center">
                <h1 className="mb-4 font-display font-black text-6xl text-mimo-noche">404.</h1>
                <p className="mb-10 text-mimo-ink">{error}</p>
                <Link to="/shelters" className="rounded-full bg-mimo-coral px-8 py-3 text-sm font-display font-extrabold uppercase tracking-widest text-white hover:bg-mimo-coralDark shadow-mimo">
                    Volver al directorio
                </Link>
            </div>
        );
    }

    const whatsappHref = shelter.whatsapp
        ? `https://wa.me/${String(shelter.whatsapp).replace(/[^\d]/g, '')}`
        : null;

    return (
        <div className="min-h-screen bg-mimo-muted pb-20 font-sans text-mimo-noche">
            {/* Hero */}
            <div className="relative w-full">
                <div className="h-52 w-full overflow-hidden bg-gradient-to-br from-mimo-warm to-mimo-muted md:h-72">
                    {shelter.cover_url ? (
                        <img src={shelter.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                </div>
                <div className="mx-auto -mt-16 w-full max-w-5xl px-6">
                    <div className="flex flex-col gap-6 rounded-[40px] border border-mimo-muted bg-mimo-warm p-8 shadow-[0_15px_40px_rgba(0,0,0,0.05)] md:flex-row md:items-end md:p-10">
                        <div className="-mt-16 md:mt-0">
                            {shelter.logo_url ? (
                                <img src={shelter.logo_url} alt="" className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white shadow-md bg-mimo-warm" />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-mimo-coral ring-4 ring-white shadow-md text-3xl font-bold text-white">
                                    {shelter.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-mimo-quiet">
                                Refugio
                            </span>
                            <h1 className="mt-1 font-display font-black text-3xl tracking-tight text-mimo-noche md:text-5xl leading-none">
                                {shelter.name}
                            </h1>
                            {(shelter.city || shelter.address) && (
                                <p className="mt-2 text-sm font-medium text-mimo-ink">
                                    📍 {[shelter.address, shelter.city].filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </div>
                        <Link to="/shelters" className="rounded-full border border-mimo-muted bg-mimo-warm px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-mimo-ink hover:bg-mimo-muted">
                            ← Directorio
                        </Link>
                    </div>
                </div>
            </div>

            <div className="mx-auto mt-10 grid w-full max-w-5xl grid-cols-1 gap-6 px-6 md:grid-cols-3">
                <div className="space-y-6 md:col-span-2">
                    {shelter.bio && (
                        <div className="rounded-[32px] border border-mimo-muted bg-mimo-warm p-8">
                            <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">
                                Sobre nosotros
                            </span>
                            <p className="whitespace-pre-line text-base leading-relaxed text-mimo-ink">
                                {shelter.bio}
                            </p>
                        </div>
                    )}

                    {shelter.hours && Object.keys(shelter.hours).length > 0 && (
                        <div className="rounded-[32px] border border-mimo-muted bg-mimo-warm p-8">
                            <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">
                                Horarios
                            </span>
                            <div className="space-y-2">
                                {HOURS_ORDER.map(([k, label]) => {
                                    const v = shelter.hours[k];
                                    if (!v) return null;
                                    return (
                                        <div key={k} className="flex justify-between border-b border-mimo-muted pb-2 text-sm">
                                            <span className="font-semibold text-mimo-ink">{label}</span>
                                            <span className="text-mimo-ink">{v}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="rounded-[32px] border border-mimo-muted bg-mimo-warm p-8">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">
                                Mascotas en adopción
                            </span>
                            <Link to={`/adoptions?shelter=${shelter.slug}`} className="text-[10px] font-bold uppercase tracking-widest text-mimo-noche hover:underline">
                                Ver todas →
                            </Link>
                        </div>
                        {pets.length === 0 ? (
                            <p className="text-sm text-mimo-quiet text-center py-8">
                                Este refugio todavía no tiene publicaciones activas.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {pets.map((p) => <PetMiniCard key={p.id} pet={p} />)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <ContactRow icon="📞" label="Teléfono" value={shelter.phone} href={shelter.phone ? `tel:${shelter.phone}` : null} />
                    <ContactRow icon="💬" label="WhatsApp" value={shelter.whatsapp} href={whatsappHref} />
                    <ContactRow icon="✉️" label="Email" value={shelter.email} href={shelter.email ? `mailto:${shelter.email}` : null} />
                    <ContactRow icon="🌐" label="Sitio web" value={shelter.website} href={shelter.website} />
                    <ContactRow
                        icon="📸"
                        label="Instagram"
                        value={shelter.instagram ? `@${String(shelter.instagram).replace(/^@/, '')}` : null}
                        href={shelter.instagram ? `https://instagram.com/${String(shelter.instagram).replace(/^@/, '')}` : null}
                    />
                </div>
            </div>
        </div>
    );
}
