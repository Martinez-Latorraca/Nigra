import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ChevronRight, HouseHeart } from 'lucide-react';
import { C, SECTION } from '../utils/theme';
import { SectionBand, PageBody, Count, EmptyState, OutlineButton, CardGrid } from '../components/ui';

const API = import.meta.env.VITE_API_URL || '';
const PAGE_LIMIT = 20;

// Sin logo, la inicial va sobre un color de la paleta (fijo por refugio).
const FALLBACK_COLORS = [C.teal, C.violeta, C.coral, C.sol, C.noche];

function ShelterCard({ shelter }) {
    const color = FALLBACK_COLORS[Number(shelter.id) % FALLBACK_COLORS.length] || C.teal;
    return (
        <Link to={`/shelters/${shelter.slug}`} className="group bg-white rounded-3xl p-5 flex flex-col gap-3.5 hover:shadow-card transition-shadow">
            <div className="flex items-center gap-3.5">
                {shelter.logo_url ? (
                    <img src={shelter.logo_url} alt="" className="w-14 h-14 rounded-[18px] object-cover bg-mimo-muted shrink-0" />
                ) : (
                    <span className="w-14 h-14 rounded-[18px] flex items-center justify-center font-display font-black text-2xl text-mimo-muted shrink-0" style={{ background: color }}>
                        {shelter.name.charAt(0).toUpperCase()}
                    </span>
                )}
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <b className="font-display font-black text-xl truncate group-hover:text-mimo-coral">{shelter.name}</b>
                    {shelter.city && (
                        <span className="flex items-center gap-1 text-sm">
                            <MapPin size={14} strokeWidth={2} className="shrink-0" />
                            <span className="truncate capitalize">{shelter.city.toLowerCase()}</span>
                        </span>
                    )}
                </span>
                <ChevronRight size={20} strokeWidth={2} className="shrink-0" />
            </div>
            {shelter.bio && <p className="m-0 text-[15px] leading-normal line-clamp-2">{shelter.bio}</p>}
        </Link>
    );
}

export default function Shelters() {
    const [shelters, setShelters] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [city, setCity] = useState('');
    const [appliedCity, setAppliedCity] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');

    const fetchShelters = async (nextPage = 1, cityFilter = '') => {
        if (nextPage === 1) setLoading(true);
        else setLoadingMore(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: nextPage, limit: PAGE_LIMIT });
            if (cityFilter) params.set('city', cityFilter);
            const res = await fetch(`${API}/api/shelters?${params}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setShelters((prev) => (nextPage === 1 ? data.shelters || [] : [...prev, ...(data.shelters || [])]));
            setTotal(data.total || 0);
            setPage(nextPage);
        } catch {
            setError('No pudimos cargar los refugios. Probá de nuevo en un rato.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => { fetchShelters(1); }, []);

    const submit = (e) => {
        e.preventDefault();
        setAppliedCity(city.trim());
        fetchShelters(1, city.trim());
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <SectionBand
                color={SECTION.refugios}
                eyebrow="Directorio Mimo"
                title="Refugios aliados"
                subtitle="Protectoras y refugios que trabajan con adopciones. Contactalos directamente."
            />

            <PageBody>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <form onSubmit={submit} className="flex items-center gap-2.5 w-full sm:w-[460px] h-[52px] pl-4 pr-1.5 rounded-2xl bg-white border border-mimo-muted focus-within:border-mimo-noche">
                        <Search size={18} strokeWidth={2} className="shrink-0" />
                        <input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Ciudad (Montevideo, Salto…)"
                            aria-label="Ciudad"
                            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-mimo-noche/60"
                        />
                        <button type="submit" className="h-10 px-[18px] rounded-xl bg-mimo-noche text-mimo-warm text-sm font-bold">Buscar</button>
                    </form>
                    {!loading && !error && (
                        <span className="sm:ml-auto"><Count>{total} {total === 1 ? 'resultado' : 'resultados'}</Count></span>
                    )}
                </div>

                {loading ? (
                    <CardGrid cols={3}>
                        {Array.from({ length: 6 }, (_, i) => (
                            <div key={i} className="bg-white rounded-3xl p-5 flex items-center gap-3.5 animate-pulse">
                                <div className="w-14 h-14 rounded-[18px] bg-mimo-muted" />
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="h-5 w-32 rounded bg-mimo-muted" />
                                    <div className="h-3 w-20 rounded bg-mimo-muted" />
                                </div>
                            </div>
                        ))}
                    </CardGrid>
                ) : (
                    <CardGrid cols={3}>
                        {error ? (
                            <EmptyState icon={HouseHeart} color={SECTION.refugios} title="No pudimos cargar los refugios" text={error} />
                        ) : shelters.length === 0 ? (
                            <EmptyState
                                icon={HouseHeart}
                                color={SECTION.refugios}
                                title={appliedCity ? `No hay refugios en ${appliedCity}` : 'Todavía no hay refugios'}
                                text={appliedCity ? 'Probá con otra ciudad.' : 'Cuando se sumen protectoras y refugios, van a aparecer acá.'}
                            />
                        ) : (
                            shelters.map((s) => <ShelterCard key={s.id} shelter={s} />)
                        )}
                    </CardGrid>
                )}

                {!loading && page < totalPages && (
                    <div className="flex justify-center mt-2">
                        <OutlineButton onClick={() => fetchShelters(page + 1, appliedCity)} disabled={loadingMore}>
                            {loadingMore ? 'Cargando…' : 'Cargar más'}
                        </OutlineButton>
                    </div>
                )}
            </PageBody>
        </div>
    );
}
