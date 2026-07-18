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
                    ? 'border-[#FFB830]/40 bg-white ring-1 ring-[#FFB830]/20'
                    : 'border-gray-100 bg-white'
            }`}
        >
            <div className="relative h-32 overflow-hidden bg-gradient-to-br from-[#FFF6F0] to-[#F0EBE8]">
                {vet.cover_url ? (
                    <img
                        src={vet.cover_url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : null}
                {isSponsor && (
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#FFB830] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white shadow-md">
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
                            className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow-sm -mt-8 bg-white"
                        />
                    ) : (
                        <div className="h-12 w-12 rounded-2xl bg-[#FF5C6C] flex items-center justify-center ring-2 ring-white shadow-sm -mt-8 text-white font-bold text-lg">
                            {vet.name.charAt(0)}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold tracking-tight text-gray-900">
                            {vet.name}
                        </h3>
                        {vet.city ? (
                            <p className="mt-0.5 text-xs font-medium text-gray-400">📍 {vet.city}</p>
                        ) : null}
                    </div>
                </div>
                {vet.bio ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-500">
                        {vet.bio}
                    </p>
                ) : null}
                {vet.services && vet.services.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {vet.services.slice(0, 3).map((s) => (
                            <span
                                key={s}
                                className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-500"
                            >
                                {s}
                            </span>
                        ))}
                        {vet.services.length > 3 ? (
                            <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-400">
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
        <div className="min-h-screen bg-[#F5F5F7] pb-20 font-sans text-gray-900">
            <div className="mx-auto w-full max-w-6xl px-6 pt-16">
                <span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Directorio Mimo
                </span>
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <h1 className="text-5xl font-semibold tracking-tighter text-black md:text-7xl">
                        Veterinarias<br className="hidden md:block" /> aliadas.
                    </h1>
                    <p className="max-w-md text-sm leading-relaxed text-gray-500">
                        Encontrá una veterinaria cerca tuyo. Las marcadas como{' '}
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFB830]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#C98800]">
                            ⭐ Socio Mimo
                        </span>{' '}
                        colaboran activamente con la comunidad.
                    </p>
                </div>

                <form
                    onSubmit={handleCitySubmit}
                    className="mt-10 flex flex-col gap-3 rounded-full border border-gray-100 bg-white p-2 shadow-[0_2px_15px_rgba(0,0,0,0.02)] sm:flex-row"
                >
                    <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Buscar por ciudad (Montevideo, Salto, Rivera…)"
                        className="flex-1 rounded-full bg-transparent px-6 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none"
                    />
                    <button
                        type="submit"
                        className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-gray-800 active:scale-95"
                    >
                        Buscar
                    </button>
                </form>
            </div>

            <div className="mx-auto w-full max-w-6xl px-6 pt-14">
                {loading ? (
                    <div className="py-24 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 animate-pulse">
                            Cargando directorio
                        </div>
                    </div>
                ) : error ? (
                    <div className="rounded-3xl bg-red-50 p-6 text-center text-sm font-semibold text-red-500">
                        {error}
                    </div>
                ) : vets.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-2xl font-semibold text-gray-300">
                            Todavía no hay veterinarias por acá.
                        </p>
                        <p className="mt-2 text-sm text-gray-400">
                            Volvé a mirar en unos días — la comunidad está creciendo.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
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
                                    className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-30"
                                >
                                    ←
                                </button>
                                <span className="flex items-center px-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => fetchVets(page + 1, city)}
                                    disabled={page === totalPages}
                                    className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-30"
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
