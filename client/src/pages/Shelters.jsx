import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
const PAGE_LIMIT = 20;

function ShelterCard({ shelter }) {
    return (
        <Link
            to={`/shelters/${shelter.slug}`}
            className="group flex flex-col overflow-hidden rounded-[32px] border border-mimo-muted bg-mimo-warm transition-all hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)]"
        >
            <div className="relative h-32 overflow-hidden bg-gradient-to-br from-mimo-warm to-mimo-muted">
                {shelter.cover_url ? (
                    <img src={shelter.cover_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : null}
            </div>
            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-3">
                    {shelter.logo_url ? (
                        <img src={shelter.logo_url} alt="" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow-sm -mt-8 bg-mimo-warm" />
                    ) : (
                        <div className="h-12 w-12 rounded-2xl bg-mimo-coral flex items-center justify-center ring-2 ring-white shadow-sm -mt-8 text-white font-bold text-lg">
                            {shelter.name.charAt(0)}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold tracking-tight text-mimo-noche">{shelter.name}</h3>
                        {shelter.city ? (
                            <p className="mt-0.5 text-xs font-medium text-mimo-quiet">📍 {shelter.city}</p>
                        ) : null}
                    </div>
                </div>
                {shelter.bio ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-mimo-ink">{shelter.bio}</p>
                ) : null}
            </div>
        </Link>
    );
}

export default function Shelters() {
    const [shelters, setShelters] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchShelters = async (nextPage = 1, cityFilter = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: nextPage, limit: PAGE_LIMIT });
            if (cityFilter) params.set('city', cityFilter);
            const res = await fetch(`${API}/api/shelters?${params}`);
            const data = await res.json();
            if (res.ok) {
                setShelters(data.shelters || []);
                setTotal(data.total || 0);
                setPage(nextPage);
            }
        } catch { /* silencioso */ } finally { setLoading(false); }
    };

    useEffect(() => { fetchShelters(1); }, []);

    const submit = (e) => {
        e.preventDefault();
        fetchShelters(1, city.trim());
    };

    return (
        <div className="min-h-screen bg-mimo-muted pb-20 font-sans text-mimo-noche">
            <div className="mx-auto w-full max-w-6xl px-6 pt-16">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">
                    Directorio Mimo
                </span>
                <h1 className="mt-2 font-display font-black text-4xl md:text-6xl tracking-tight text-mimo-noche">
                    Refugios aliados.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-mimo-ink">
                    Protectoras y refugios que trabajan con adopciones. Contactalos directamente para
                    conocer a los animales que buscan hogar.
                </p>

                <form onSubmit={submit} className="mt-10 flex gap-2 max-w-md">
                    <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ciudad (Montevideo, Salto…)"
                        className="flex-1 rounded-full border border-mimo-muted bg-mimo-warm px-5 py-3 text-sm font-medium text-mimo-noche placeholder:text-mimo-quiet focus:outline-none"
                    />
                    <button
                        type="submit"
                        className="rounded-full bg-mimo-noche px-6 py-3 text-xs font-display font-extrabold uppercase tracking-widest text-white hover:bg-mimo-noche/85"
                    >
                        Buscar
                    </button>
                </form>

                <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-mimo-quiet">
                    {loading ? 'Cargando…' : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shelters.map((s) => <ShelterCard key={s.id} shelter={s} />)}
                </div>

                {!loading && shelters.length === 0 ? (
                    <p className="mt-16 text-center text-sm text-mimo-quiet">
                        Todavía no hay refugios registrados por acá.
                    </p>
                ) : null}
            </div>
        </div>
    );
}
