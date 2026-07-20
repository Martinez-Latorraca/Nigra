import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

function VetCard({ vet }) {
    const isSponsor = !!vet.verified_at;
    return (
        <Link
            to={`/vets/${vet.slug}`}
            className={`group flex flex-col overflow-hidden rounded-[32px] border transition-all hover:shadow-[0_15px_40px_rgba(0,0,0,0.08)] ${
                isSponsor
                    ? 'border-mimo-sol/40 bg-mimo-warm ring-1 ring-mimo-sol/20'
                    : 'border-mimo-muted bg-mimo-warm'
            }`}
        >
            <div className="relative h-32 overflow-hidden bg-gradient-to-br from-mimo-warm to-mimo-muted">
                {vet.cover_url ? (
                    <img
                        src={vet.cover_url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : null}
                {isSponsor && (
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-mimo-sol px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white shadow-md">
                        <span>⭐</span>
                        <span>Socio Mimo</span>
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-3">
                    {vet.logo_url ? (
                        <img
                            src={vet.logo_url}
                            alt=""
                            className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow-sm -mt-8 bg-mimo-warm"
                        />
                    ) : (
                        <div className="h-12 w-12 rounded-2xl bg-mimo-coral flex items-center justify-center ring-2 ring-white shadow-sm -mt-8 text-white font-bold text-lg">
                            {vet.name.charAt(0)}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold tracking-tight text-mimo-noche">
                            {vet.name}
                        </h3>
                        {vet.city ? (
                            <p className="mt-0.5 text-xs font-medium text-mimo-quiet">📍 {vet.city}</p>
                        ) : null}
                    </div>
                </div>
                {vet.bio ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-mimo-ink">
                        {vet.bio}
                    </p>
                ) : null}
                {vet.services && vet.services.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {vet.services.slice(0, 3).map((s) => (
                            <span
                                key={s}
                                className="rounded-full bg-mimo-muted px-2.5 py-1 text-[10px] font-semibold text-mimo-ink"
                            >
                                {s}
                            </span>
                        ))}
                        {vet.services.length > 3 ? (
                            <span className="rounded-full bg-mimo-muted px-2.5 py-1 text-[10px] font-semibold text-mimo-quiet">
                                +{vet.services.length - 3}
                            </span>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </Link>
    );
}

export default function Vets() {
    const [vets, setVets] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const limit = 12;

    const fetchVets = async (nextPage = 1, cityFilter = '') => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: nextPage, limit });
            if (cityFilter) params.set('city', cityFilter);
            const res = await fetch(`${API}/api/vets?${params}`);
            if (!res.ok) throw new Error('No se pudo cargar el directorio.');
            const data = await res.json();
            setVets(data.vets || []);
            setTotal(data.total || 0);
            setPage(nextPage);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVets(1, '');
    }, []);

    const handleCitySubmit = (e) => {
        e.preventDefault();
        fetchVets(1, city.trim());
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="min-h-screen bg-mimo-muted pb-20 font-sans text-mimo-noche">
            <div className="mx-auto w-full max-w-6xl px-6 pt-16">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">
                    Directorio Mimo
                </span>
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <h1 className="font-display font-black text-5xl tracking-tight text-mimo-noche md:text-7xl leading-none">
                        Veterinarias<br className="hidden md:block" /> aliadas.
                    </h1>
                    <div className="flex flex-col items-start gap-4 md:items-end">
                        <p className="max-w-md text-sm leading-relaxed text-mimo-ink">
                            Encontrá una veterinaria cerca tuyo. Las marcadas como{' '}
                            <span className="inline-flex items-center gap-1 rounded-full bg-mimo-sol/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-mimo-solDark">
                                ⭐ Socio Mimo
                            </span>{' '}
                            colaboran activamente con la comunidad.
                        </p>
                        <Link
                            to="/vets/register"
                            className="inline-flex items-center gap-2 rounded-full bg-mimo-coral px-5 py-2.5 text-xs font-display font-extrabold uppercase tracking-widest text-white transition-all hover:bg-mimo-coralDark shadow-mimo active:scale-95"
                        >
                            🏥 Registrá tu vet
                        </Link>
                    </div>
                </div>

                <form
                    onSubmit={handleCitySubmit}
                    className="mt-10 flex flex-col gap-3 rounded-full border border-mimo-muted bg-mimo-warm p-2 shadow-[0_2px_15px_rgba(0,0,0,0.02)] sm:flex-row"
                >
                    <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Buscar por ciudad (Montevideo, Salto, Rivera…)"
                        className="flex-1 rounded-full bg-transparent px-6 py-3 text-sm font-medium text-mimo-noche placeholder:text-mimo-quiet focus:outline-none"
                    />
                    <button
                        type="submit"
                        className="rounded-full bg-mimo-noche px-6 py-3 text-sm font-display font-extrabold uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
                    >
                        Buscar
                    </button>
                </form>
            </div>

            <div className="mx-auto w-full max-w-6xl px-6 pt-14">
                {loading ? (
                    <div className="py-24 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet animate-pulse">
                            Cargando directorio
                        </div>
                    </div>
                ) : error ? (
                    <div className="rounded-3xl bg-red-50 p-6 text-center text-sm font-semibold text-red-500">
                        {error}
                    </div>
                ) : vets.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-2xl font-semibold text-mimo-quiet">
                            Todavía no hay veterinarias por acá.
                        </p>
                        <p className="mt-2 text-sm text-mimo-quiet">
                            Volvé a mirar en unos días — la comunidad está creciendo.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-mimo-quiet">
                                {total} {total === 1 ? 'resultado' : 'resultados'}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {vets.map((v) => (
                                <VetCard key={v.id} vet={v} />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="mt-12 flex justify-center gap-2">
                                <button
                                    onClick={() => fetchVets(page - 1, city)}
                                    disabled={page === 1}
                                    className="rounded-full border border-mimo-muted bg-mimo-warm px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-mimo-ink transition-all hover:bg-mimo-muted disabled:opacity-30"
                                >
                                    ←
                                </button>
                                <span className="flex items-center px-4 text-xs font-bold uppercase tracking-widest text-mimo-quiet">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => fetchVets(page + 1, city)}
                                    disabled={page === totalPages}
                                    className="rounded-full border border-mimo-muted bg-mimo-warm px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-mimo-ink transition-all hover:bg-mimo-muted disabled:opacity-30"
                                >
                                    →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
