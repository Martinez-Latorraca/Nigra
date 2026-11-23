import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Star, Stethoscope, LocateFixed } from 'lucide-react';
import { tierOf } from '../utils/sponsorTiers';
import { trackAdClick } from '../utils/vetTracking';
import { useTrackImpression } from '../utils/useTrackImpressions';
import { C } from '../utils/theme';
import { SectionBand, PageBody, FilterChip, TierChip, Count, EmptyState, OutlineButton, CardGrid } from '../components/ui';

const API = import.meta.env.VITE_API_URL || '';
const LIMIT = 12;

// Debe coincidir con el catálogo del edit form (Profile.jsx SERVICE_CATALOG).
// Es duplicación deliberada: mantenerlo acá evita un import cross-page.
const SERVICE_CATALOG = [
    'Consultas',
    'Vacunación',
    'Cirugía',
    'Urgencias 24h',
    'Peluquería',
    'Baño',
    'Radiología',
    'Ecografía',
    'Laboratorio',
    'Guardería',
    'Adiestramiento',
    'Atención a domicilio',
];

// Sin logo, la inicial va sobre un color de la paleta (fijo por vet).
const FALLBACK_COLORS = [C.teal, C.noche, C.violeta, C.coral, C.sol];

function VetAvatar({ vet }) {
    const color = tierOf(vet)?.color || FALLBACK_COLORS[Number(vet.id) % FALLBACK_COLORS.length] || C.coral;
    return vet.logo_url ? (
        <img src={vet.logo_url} alt="" className="w-14 h-14 rounded-[18px] object-cover bg-mimo-muted shrink-0" />
    ) : (
        <span className="w-14 h-14 rounded-[18px] flex items-center justify-center font-display font-black text-2xl text-mimo-muted shrink-0" style={{ background: color }}>
            {vet.name.charAt(0).toUpperCase()}
        </span>
    );
}

function ServiceTags({ services }) {
    if (!services?.length) return null;
    return (
        <span className="flex flex-wrap gap-1.5">
            {services.slice(0, 2).map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-full bg-mimo-warm text-[13px]">{s}</span>
            ))}
            {services.length > 2 && <span className="px-2.5 py-1 rounded-full bg-mimo-warm text-[13px]">+{services.length - 2}</span>}
        </span>
    );
}

// Card de vet. `ad` = item del banner de socios (cuenta impresión y clic).
function VetCard({ vet, ad = false }) {
    const tier = tierOf(vet);
    const impressionRef = useTrackImpression(ad ? vet.id : null);
    return (
        <Link
            to={`/vets/${vet.slug}`}
            onClick={ad ? () => trackAdClick(vet.id) : undefined}
            ref={ad ? impressionRef : undefined}
            className={`group bg-white rounded-3xl p-5 flex flex-col gap-3.5 hover:shadow-card transition-shadow ${tier ? 'border-2' : ''}`}
            style={tier ? { borderColor: tier.color } : undefined}
        >
            <div className="flex items-center gap-3.5">
                <VetAvatar vet={vet} />
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <b className="font-display font-black text-xl truncate group-hover:text-mimo-coral">{vet.name}</b>
                    {vet.city && (
                        <span className="flex items-center gap-1 text-sm">
                            <MapPin size={14} strokeWidth={2} className="shrink-0" />
                            <span className="truncate">{vet.city}</span>
                        </span>
                    )}
                </span>
                <ChevronRight size={20} strokeWidth={2} className="shrink-0" />
            </div>
            <TierChip vet={vet} />
            {vet.bio && <p className="m-0 text-[15px] leading-normal line-clamp-2">{vet.bio}</p>}
            <ServiceTags services={vet.services} />
        </Link>
    );
}

export default function Vets() {
    const [vets, setVets] = useState([]);
    const [ads, setAds] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [city, setCity] = useState('');
    const [servicesSelected, setServicesSelected] = useState(() => new Set());
    // Geolocalización opt-in: null hasta que el user pide "Cerca mío".
    const [coords, setCoords] = useState(null);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoError, setGeoError] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');

    const fetchVets = async (nextPage = 1, cityFilter = '', services = new Set(), geo = null) => {
        if (nextPage === 1) setLoading(true);
        else setLoadingMore(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: nextPage, limit: LIMIT });
            if (cityFilter) params.set('city', cityFilter);
            if (services.size > 0) params.set('services', [...services].join(','));
            if (geo) {
                params.set('lat', String(geo.lat));
                params.set('lng', String(geo.lng));
                params.set('radius_km', '25'); // default razonable para "cerca mío"
            }
            const res = await fetch(`${API}/api/vets?${params}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setVets((prev) => (nextPage === 1 ? data.vets || [] : [...prev, ...(data.vets || [])]));
            setTotal(data.total || 0);
            setPage(nextPage);
        } catch {
            setError('No pudimos cargar el directorio. Probá de nuevo en un rato.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchVets(1, '', new Set(), null);
    }, []);

    // Sponsors para "Nuestros socios". Mismo endpoint que el feed de mascotas:
    // el server ordena por distancia si hay coords, por plan si no.
    useEffect(() => {
        const fetchAds = (params) => {
            const qs = new URLSearchParams({ limit: 6, ...params });
            fetch(`${API}/api/vets/ads?${qs}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (d) setAds(d.vets || []); })
                .catch(() => {});
        };
        if (navigator.geolocation && navigator.permissions?.query) {
            navigator.permissions.query({ name: 'geolocation' })
                .then((s) => {
                    if (s.state === 'granted') {
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
    }, []);

    const handleCitySubmit = (e) => {
        e.preventDefault();
        fetchVets(1, city.trim(), servicesSelected, coords);
    };

    const toggleService = (s) => {
        const next = new Set(servicesSelected);
        if (next.has(s)) next.delete(s);
        else next.add(s);
        setServicesSelected(next);
        fetchVets(1, city.trim(), next, coords);
    };

    const toggleNearMe = () => {
        setGeoError('');
        if (coords) {
            setCoords(null);
            fetchVets(1, city.trim(), servicesSelected, null);
            return;
        }
        if (!navigator.geolocation) {
            setGeoError('Tu navegador no permite usar la ubicación.');
            return;
        }
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const g = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCoords(g);
                setGeoLoading(false);
                fetchVets(1, city.trim(), servicesSelected, g);
            },
            (err) => {
                setGeoLoading(false);
                setGeoError(
                    err.code === err.PERMISSION_DENIED
                        ? 'Necesitamos permiso de ubicación para mostrar veterinarias cerca tuyo.'
                        : 'No pudimos obtener tu ubicación. Probá de nuevo.'
                );
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
        );
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
    const hasFilters = !!city.trim() || servicesSelected.size > 0 || !!coords;

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <SectionBand
                color={C.noche}
                eyebrow="Directorio Mimo"
                title="Veterinarias aliadas"
                subtitle="Encontrá una veterinaria cerca tuyo. Las marcadas como Socio Mimo colaboran activamente con la comunidad."
                action={
                    <Link
                        to="/vets/register"
                        className="group flex items-center gap-3.5 w-full md:w-[424px] shrink-0 p-[22px] rounded-3xl bg-mimo-coral hover:bg-mimo-coralDark transition-colors"
                    >
                        <span className="w-[52px] h-[52px] rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                            <Stethoscope size={24} strokeWidth={2} />
                        </span>
                        <span className="flex-1 min-w-0 flex flex-col">
                            <b className="font-display font-black text-xl">Registrá tu veterinaria</b>
                            <span className="text-sm leading-snug">Sumate a la red y publicá mascotas encontradas.</span>
                        </span>
                        <ChevronRight size={20} strokeWidth={2} className="shrink-0" />
                    </Link>
                }
            />

            <PageBody>
                {ads.length > 0 && (
                    <section className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="m-0 flex items-center gap-2 font-display font-black text-[26px]">
                                <Star size={22} strokeWidth={2} color={C.sol} />
                                Nuestros socios
                            </h2>
                            <span className="text-[13px] font-bold tracking-[.08em] uppercase">Publicidad</span>
                        </div>
                        <CardGrid cols={3}>
                            {ads.map((v) => <VetCard key={v.id} vet={v} ad />)}
                        </CardGrid>
                    </section>
                )}

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <form onSubmit={handleCitySubmit} className="flex items-center gap-2.5 w-full lg:w-[400px] shrink-0 h-[52px] pl-4 pr-1.5 rounded-2xl bg-white border border-mimo-muted focus-within:border-mimo-noche">
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
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 lg:pb-0">
                            <FilterChip active={!!coords} onClick={toggleNearMe}>
                                <LocateFixed size={16} strokeWidth={2} className="mr-1.5" />
                                {geoLoading ? 'Ubicando…' : 'Cerca mío'}
                            </FilterChip>
                            {SERVICE_CATALOG.map((s) => (
                                <FilterChip key={s} active={servicesSelected.has(s)} onClick={() => toggleService(s)}>{s}</FilterChip>
                            ))}
                        </div>
                    </div>
                    {geoError && <p className="m-0 px-4 py-3 rounded-2xl bg-white text-sm font-bold text-mimo-coral">{geoError}</p>}
                </div>

                {!loading && !error && <Count>{total} {total === 1 ? 'resultado' : 'resultados'}</Count>}

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
                            <EmptyState icon={Stethoscope} color={C.coral} title="No pudimos cargar el directorio" text={error} />
                        ) : vets.length === 0 ? (
                            <EmptyState
                                icon={Stethoscope}
                                color={C.coral}
                                title={hasFilters ? 'No encontramos veterinarias' : 'Todavía no hay veterinarias'}
                                text={hasFilters ? 'Probá con otra ciudad o sacá algún filtro.' : 'Volvé a mirar en unos días: la comunidad está creciendo.'}
                            />
                        ) : (
                            vets.map((v) => <VetCard key={v.id} vet={v} />)
                        )}
                    </CardGrid>
                )}

                {!loading && page < totalPages && (
                    <div className="flex justify-center mt-2">
                        <OutlineButton onClick={() => fetchVets(page + 1, city.trim(), servicesSelected, coords)} disabled={loadingMore}>
                            {loadingMore ? 'Cargando…' : 'Cargar más'}
                        </OutlineButton>
                    </div>
                )}
            </PageBody>
        </div>
    );
}
