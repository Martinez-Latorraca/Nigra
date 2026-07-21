import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tierOf } from '../utils/sponsorTiers';

const API = import.meta.env.VITE_API_URL || '';

const HOURS_ORDER = [
    ['mon', 'Lunes'],
    ['tue', 'Martes'],
    ['wed', 'Miércoles'],
    ['thu', 'Jueves'],
    ['fri', 'Viernes'],
    ['sat', 'Sábado'],
    ['sun', 'Domingo'],
];

function ContactRow({ icon, label, value, href }) {
    if (!value) return null;
    const content = (
        <div className="flex items-center gap-3 rounded-2xl border border-mimo-muted bg-mimo-warm px-4 py-3 transition-all hover:border-mimo-muted">
            <span className="text-lg">{icon}</span>
            <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold uppercase tracking-widest text-mimo-quiet">
                    {label}
                </div>
                <div className="truncate text-sm font-semibold text-mimo-noche">{value}</div>
            </div>
        </div>
    );
    if (!href) return content;
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block">
            {content}
        </a>
    );
}

export default function VetProfile() {
    const { slug } = useParams();
    const [vet, setVet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        fetch(`${API}/api/vets/${slug}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not_found'))))
            .then((data) => setVet(data))
            .catch(() => setError('No pudimos encontrar esta veterinaria.'))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-mimo-muted">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet animate-pulse">
                    Cargando
                </div>
            </div>
        );
    }

    if (error || !vet) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-mimo-muted p-6 text-center">
                <h1 className="mb-4 font-display font-black text-6xl text-mimo-noche">404.</h1>
                <p className="mb-10 text-mimo-ink">{error}</p>
                <Link to="/vets" className="rounded-full bg-mimo-coral px-8 py-3 text-sm font-display font-extrabold uppercase tracking-widest text-white hover:bg-mimo-coralDark shadow-mimo">
                    Volver al directorio
                </Link>
            </div>
        );
    }

    const tier = tierOf(vet);
    const whatsappHref = vet.whatsapp
        ? `https://wa.me/${String(vet.whatsapp).replace(/[^\d]/g, '')}`
        : null;

    return (
        <div className="min-h-screen bg-mimo-muted pb-20 font-sans text-mimo-noche">
            {/* Hero */}
            <div className="relative w-full">
                <div className="h-52 w-full overflow-hidden bg-gradient-to-br from-mimo-warm to-mimo-muted md:h-72">
                    {vet.cover_url ? (
                        <img
                            src={vet.cover_url}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    ) : null}
                </div>
                <div className="mx-auto -mt-16 w-full max-w-5xl px-6">
                    <div className="flex flex-col gap-6 rounded-[40px] border border-mimo-muted bg-mimo-warm p-8 shadow-[0_15px_40px_rgba(0,0,0,0.05)] md:flex-row md:items-end md:p-10">
                        <div className="-mt-16 md:mt-0">
                            {vet.logo_url ? (
                                <img
                                    src={vet.logo_url}
                                    alt=""
                                    className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white shadow-md bg-mimo-warm"
                                />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-mimo-coral ring-4 ring-white shadow-md text-3xl font-bold text-white">
                                    {vet.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-mimo-quiet">
                                    Veterinaria
                                </span>
                                {tier && (
                                    <span
                                        style={{ backgroundColor: tier.color }}
                                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white"
                                    >
                                        ⭐ {tier.label}
                                    </span>
                                )}
                            </div>
                            <h1 className="font-display font-black text-3xl tracking-tight text-mimo-noche md:text-5xl leading-none">
                                {vet.name}
                            </h1>
                            {(vet.city || vet.address) && (
                                <p className="mt-2 text-sm font-medium text-mimo-ink">
                                    📍 {[vet.address, vet.city].filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </div>
                        <Link
                            to="/vets"
                            className="rounded-full border border-mimo-muted bg-mimo-warm px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-mimo-ink transition-all hover:bg-mimo-muted"
                        >
                            ← Directorio
                        </Link>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="mx-auto mt-10 grid w-full max-w-5xl grid-cols-1 gap-6 px-6 md:grid-cols-3">
                {/* Columna principal */}
                <div className="space-y-6 md:col-span-2">
                    {vet.bio && (
                        <div className="rounded-[32px] border border-mimo-muted bg-mimo-warm p-8">
                            <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">
                                Sobre nosotros
                            </span>
                            <p className="whitespace-pre-line text-base leading-relaxed text-mimo-ink">
                                {vet.bio}
                            </p>
                        </div>
                    )}

                    {vet.services && vet.services.length > 0 && (
                        <div className="rounded-[32px] border border-mimo-muted bg-mimo-warm p-8">
                            <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">
                                Servicios
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {vet.services.map((s) => (
                                    <span
                                        key={s}
                                        className="rounded-full bg-mimo-muted px-4 py-2 text-sm font-semibold text-mimo-ink"
                                    >
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {vet.hours && Object.keys(vet.hours).length > 0 && (
                        <div className="rounded-[32px] border border-mimo-muted bg-mimo-warm p-8">
                            <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">
                                Horarios
                            </span>
                            <div className="space-y-2">
                                {HOURS_ORDER.map(([k, label]) => {
                                    const v = vet.hours[k];
                                    if (!v) return null;
                                    return (
                                        <div
                                            key={k}
                                            className="flex justify-between border-b border-mimo-muted pb-2 text-sm"
                                        >
                                            <span className="font-semibold text-mimo-ink">{label}</span>
                                            <span className="text-mimo-ink">{v}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar contacto */}
                <div className="space-y-3">
                    <ContactRow
                        icon="📞"
                        label="Teléfono"
                        value={vet.phone}
                        href={vet.phone ? `tel:${vet.phone}` : null}
                    />
                    <ContactRow
                        icon="💬"
                        label="WhatsApp"
                        value={vet.whatsapp}
                        href={whatsappHref}
                    />
                    <ContactRow
                        icon="✉️"
                        label="Email"
                        value={vet.email}
                        href={vet.email ? `mailto:${vet.email}` : null}
                    />
                    <ContactRow
                        icon="🌐"
                        label="Sitio web"
                        value={vet.website}
                        href={vet.website}
                    />
                    <ContactRow
                        icon="📸"
                        label="Instagram"
                        value={vet.instagram ? `@${String(vet.instagram).replace(/^@/, '')}` : null}
                        href={
                            vet.instagram
                                ? `https://instagram.com/${String(vet.instagram).replace(/^@/, '')}`
                                : null
                        }
                    />
                </div>
            </div>
        </div>
    );
}
