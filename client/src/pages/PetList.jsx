import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, ArrowUpRight, ArrowRight, PawPrint, Dog, Cat } from 'lucide-react';
import { translateColor, translateType } from '../utils/translations';
import { tierOf } from '../utils/sponsorTiers';
import { trackAdClick } from '../utils/vetTracking';
import { useTrackImpression } from '../utils/useTrackImpressions';
import { C, STATUS, SECTION } from '../utils/theme';
import {
    SectionBand, PageBody, FilterChip, ChipDivider, StatusChip, TierChip, Count,
    EmptyState, OutlineButton, CardGrid, SkeletonGrid,
} from '../components/ui';

const API = import.meta.env.VITE_API_URL || '';
const AD_INTERVAL = 6; // 1 card de publicidad cada 6 pets

const STATUS_FILTERS = [['all', 'Todos'], ['lost', 'Perdidos'], ['found', 'Encontrados']];
const TYPE_FILTERS = [['dog', 'Perros'], ['cat', 'Gatos']];

const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function PetCard({ pet }) {
    const isLost = pet.status === 'lost';
    const status = STATUS[isLost ? 'lost' : 'found'];
    const meta = [translateType(pet.type), translateColor(pet.color)].filter(Boolean).join(' · ');
    const title = isLost ? pet.name || 'Sin nombre' : 'Encontrado';
    const SpeciesIcon = pet.type === 'cat' ? Cat : Dog;
    return (
        <Link to={`/pet/${pet.id}`} className="group bg-white rounded-3xl p-3 flex flex-col gap-3 hover:shadow-card transition-shadow">
            <div className="relative h-[200px] rounded-[18px] bg-mimo-muted overflow-hidden flex items-center justify-center">
                {pet.photo_url ? (
                    <img
                        src={pet.photo_url}
                        alt={`${title}${meta ? ` - ${meta}` : ''}`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <SpeciesIcon size={56} strokeWidth={1.5} color={C.noche} opacity={0.35} />
                )}
                <span className="absolute top-2.5 left-2.5"><StatusChip color={status.color} small>{status.label}</StatusChip></span>
            </div>
            <div className="px-1.5 pb-1.5 flex flex-col gap-1 min-w-0">
                {meta && <span className="text-[11px] font-bold tracking-[.06em] uppercase">{meta}</span>}
                <b className="font-display font-black text-xl truncate">{title}</b>
                {pet.address && (
                    <span className="flex items-center gap-1 text-sm min-w-0">
                        <MapPin size={14} strokeWidth={2} className="shrink-0" />
                        <span className="truncate">{pet.address}</span>
                    </span>
                )}
                <span className="mt-2 pt-2.5 border-t border-mimo-muted flex justify-between text-[13px] font-bold">
                    <span>Mimo ID #{pet.id}</span>
                    <span className="flex items-center gap-0.5 group-hover:text-mimo-coral">
                        Contactar
                        <ArrowUpRight size={14} strokeWidth={2} />
                    </span>
                </span>
            </div>
        </Link>
    );
}

// Card de publicidad de un vet sponsor: borde del color del plan + etiqueta
// "Publicidad", para no confundirla con contenido orgánico.
function VetAdCard({ vet }) {
    const color = tierOf(vet)?.color || C.coral;
    const impressionRef = useTrackImpression(vet.id);
    return (
        <Link
            to={`/vets/${vet.slug}`}
            onClick={() => trackAdClick(vet.id)}
            ref={impressionRef}
            className="group bg-white rounded-3xl p-3 flex flex-col gap-3 border-2"
            style={{ borderColor: color }}
        >
            <div className="relative h-[200px] rounded-[18px] bg-mimo-muted overflow-hidden flex items-center justify-center">
                {vet.cover_url ? (
                    <img src={vet.cover_url} alt={vet.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                ) : vet.logo_url ? (
                    <img src={vet.logo_url} alt={vet.name} className="w-20 h-20 rounded-[20px] object-cover" />
                ) : (
                    <span className="w-20 h-20 rounded-[20px] bg-mimo-coral flex items-center justify-center text-mimo-muted font-display font-black text-4xl">
                        {vet.name.charAt(0)}
                    </span>
                )}
                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-mimo-noche/70 text-mimo-warm text-[11px] font-bold">
                    Publicidad
                </span>
            </div>
            <div className="px-1.5 pb-1.5 flex flex-col gap-1.5 min-w-0">
                <TierChip vet={vet} />
                <b className="font-display font-black text-xl leading-tight line-clamp-2">{vet.name}</b>
                {vet.bio && <span className="text-sm line-clamp-2">{vet.bio}</span>}
                <span className="flex items-center gap-1 text-[13px] font-bold group-hover:text-mimo-coral">
                    Ver perfil <ArrowRight size={14} strokeWidth={2} />
                </span>
            </div>
        </Link>
    );
}

function PetList() {
    const [pets, setPets] = useState([]);
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [query, setQuery] = useState('');

    // Ads del feed. Si el navegador ya tiene el permiso de ubicación otorgado
    // (Permissions API), usamos coords → orden por cercanía. Si no, sin
    // coords → orden por tier de sponsor. No pedimos permiso proactivamente
    // acá (sería intrusivo).
    useEffect(() => {
        let cancelled = false;
        const fetchAds = (params) => {
            const qs = new URLSearchParams({ limit: 8, ...params });
            fetch(`${API}/api/vets/ads?${qs}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setAds(d.vets || []); })
                .catch(() => {});
        };
        if (navigator.geolocation && navigator.permissions?.query) {
            navigator.permissions.query({ name: 'geolocation' })
                .then((status) => {
                    if (status.state === 'granted') {
                        navigator.geolocation.getCurrentPosition(
                            (pos) => fetchAds({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                            () => fetchAds({}),
                            { timeout: 5000, maximumAge: 5 * 60 * 1000 }
                        );
                    } else {
                        fetchAds({});
                    }
                })
                .catch(() => fetchAds({}));
        } else {
            fetchAds({});
        }
        return () => { cancelled = true; };
    }, []);

    const fetchPets = useCallback(async (pageNum, append = false) => {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: pageNum, limit: 12 });
            if (filterType !== 'all') params.set('type', filterType);
            if (filterStatus !== 'all') params.set('status', filterStatus);
            const response = await fetch(`${API}/api/pets?${params}`);
            if (!response.ok) throw new Error();
            const data = await response.json();
            setPets(prev => append ? [...prev, ...data.pets] : data.pets);
            setPage(data.page);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch {
            setError('No pudimos cargar los reportes. Probá de nuevo en un rato.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [filterType, filterStatus]);

    // Cuando cambian los filtros, volvemos a la página 1.
    useEffect(() => {
        fetchPets(1);
    }, [fetchPets]);

    // El buscador filtra lo que ya está cargado (barrio o nombre).
    const visible = useMemo(() => {
        const q = normalize(query.trim());
        if (!q) return pets;
        return pets.filter((p) => normalize(p.address).includes(q) || normalize(p.name).includes(q));
    }, [pets, query]);

    const resetFilters = () => {
        setFilterType('all');
        setFilterStatus('all');
        setQuery('');
    };

    const items = visible.reduce((acc, pet, i) => {
        acc.push(<PetCard key={pet.id} pet={pet} />);
        // Intercalar 1 card de publicidad cada AD_INTERVAL pets.
        if (!query && (i + 1) % AD_INTERVAL === 0) {
            const ad = ads[Math.floor((i + 1) / AD_INTERVAL) - 1];
            if (ad) acc.push(<VetAdCard key={`ad-${ad.id}`} vet={ad} />);
        }
        return acc;
    }, []);

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <SectionBand color={SECTION.explorar} title="Explorar" subtitle="Reportes de mascotas perdidas y encontradas en tu zona." />

            <PageBody>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 lg:pb-0">
                        {STATUS_FILTERS.map(([value, label]) => (
                            <FilterChip key={value} active={filterStatus === value} onClick={() => setFilterStatus(value)}>{label}</FilterChip>
                        ))}
                        <ChipDivider />
                        {TYPE_FILTERS.map(([value, label]) => (
                            <FilterChip key={value} active={filterType === value} onClick={() => setFilterType(filterType === value ? 'all' : value)}>
                                {label}
                            </FilterChip>
                        ))}
                    </div>
                    <label className="lg:ml-auto flex items-center gap-2.5 w-full lg:w-[340px] h-[52px] px-4 rounded-2xl bg-white border border-mimo-muted focus-within:border-mimo-noche">
                        <Search size={18} strokeWidth={2} className="shrink-0" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar por barrio o nombre"
                            aria-label="Buscar por barrio o nombre"
                            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-mimo-noche/60"
                        />
                    </label>
                </div>

                {!loading && !error && (
                    <Count>{query ? `${visible.length} de ${pets.length} cargados` : `${total} ${total === 1 ? 'reporte' : 'reportes'}`}</Count>
                )}

                {loading ? (
                    <SkeletonGrid />
                ) : (
                    <CardGrid>
                        {error ? (
                            <EmptyState icon={PawPrint} color={SECTION.explorar} title="No pudimos cargar los reportes" text={error} />
                        ) : items.length === 0 ? (
                            <EmptyState
                                icon={PawPrint}
                                color={SECTION.explorar}
                                title="No encontramos reportes"
                                text={query || filterType !== 'all' || filterStatus !== 'all'
                                    ? 'Probá con otros filtros o buscá otro barrio.'
                                    : 'Por ahora nadie reportó mascotas perdidas ni encontradas. Buena señal.'}
                                action={(query || filterType !== 'all' || filterStatus !== 'all') && (
                                    <OutlineButton onClick={resetFilters}>Limpiar filtros</OutlineButton>
                                )}
                            />
                        ) : items}
                    </CardGrid>
                )}

                {!loading && page < totalPages && (
                    <div className="flex justify-center mt-2">
                        <OutlineButton onClick={() => fetchPets(page + 1, true)} disabled={loadingMore}>
                            {loadingMore ? 'Cargando…' : 'Cargar más'}
                        </OutlineButton>
                    </div>
                )}
            </PageBody>
        </div>
    );
}

export default PetList;
