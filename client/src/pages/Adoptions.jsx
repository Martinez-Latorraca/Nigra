import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, HouseHeart, PawPrint } from 'lucide-react';
import { C, SECTION } from '../utils/theme';
import {
    SectionBand, PageBody, SelectPill, StatusChip, Count, EmptyState, OutlineButton, CardGrid, SkeletonGrid,
} from '../components/ui';

const API = import.meta.env.VITE_API_URL || '';
const PAGE_LIMIT = 24;

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior' };

const EMPTY_FILTERS = { species: '', sex: '', size: '', age_group: '', city: '', shelter_id: '' };

function AdoptionCard({ pet }) {
    const photo = pet.photos?.[0];
    const adopted = !!pet.adopted_at;
    const meta = [SPECIES_LABEL[pet.species], SIZE_LABEL[pet.size], AGE_LABEL[pet.age_group]].filter(Boolean).join(' · ');
    return (
        <Link to={`/adoptions/${pet.id}`} className="group bg-white rounded-3xl overflow-hidden flex flex-col hover:shadow-card transition-shadow">
            <div className="relative h-[220px] bg-mimo-muted overflow-hidden flex items-center justify-center">
                {photo ? (
                    <img src={photo} alt={pet.name || 'En adopción'} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                    <PawPrint size={56} strokeWidth={1.5} color={C.noche} opacity={0.35} />
                )}
                <span className="absolute top-3 left-3">
                    <StatusChip color={adopted ? C.noche : C.violeta} small>{adopted ? 'Adoptado' : 'En adopción'}</StatusChip>
                </span>
            </div>
            <div className="px-4 pt-4 pb-[18px] flex flex-col gap-1 min-w-0">
                <b className="font-display font-black text-xl truncate">{pet.name || 'Sin nombre'}</b>
                {meta && <span className="text-sm">{meta}</span>}
                <span className="mt-2 flex items-center gap-1.5 text-sm font-bold min-w-0">
                    <HouseHeart size={16} strokeWidth={2} className="shrink-0" />
                    <span className="truncate">{pet.shelter_name}</span>
                </span>
            </div>
        </Link>
    );
}

export default function Adoptions() {
    const [pets, setPets] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [city, setCity] = useState('');
    // Refugios para el desplegable. Hasta 50 (cap del server).
    const [shelters, setShelters] = useState([]);

    const fetchPets = async (nextPage = 1, f = filters) => {
        if (nextPage === 1) setLoading(true);
        else setLoadingMore(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: nextPage, limit: PAGE_LIMIT });
            for (const [k, v] of Object.entries(f)) if (v) params.set(k, v);
            const res = await fetch(`${API}/api/adoption-pets?${params}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setPets((prev) => (nextPage === 1 ? data.pets || [] : [...prev, ...(data.pets || [])]));
            setTotal(data.total || 0);
            setPage(nextPage);
        } catch {
            setError('No pudimos cargar las mascotas. Probá de nuevo en un rato.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => { fetchPets(1); /* eslint-disable-line */ }, []);

    useEffect(() => {
        fetch(`${API}/api/shelters?limit=50`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d) setShelters(d.shelters || []); })
            .catch(() => {});
    }, []);

    const updateFilter = (k, v) => {
        const next = { ...filters, [k]: v };
        setFilters(next);
        fetchPets(1, next);
    };

    const submitCity = (e) => {
        e.preventDefault();
        updateFilter('city', city.trim());
    };

    const resetFilters = () => {
        setFilters(EMPTY_FILTERS);
        setCity('');
        fetchPets(1, EMPTY_FILTERS);
    };

    const hasFilters = Object.values(filters).some(Boolean);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            <SectionBand
                color={SECTION.adopciones}
                eyebrow="Refugios Mimo"
                title="En adopción"
                subtitle="Mascotas que están esperando una familia. Contactá al refugio directamente."
            />

            <PageBody>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 lg:pb-0">
                        <SelectPill label="Especie" value={filters.species} onChange={(v) => updateFilter('species', v)}
                            options={[['', 'Todos'], ['dog', 'Perros'], ['cat', 'Gatos'], ['other', 'Otros']]} />
                        <SelectPill label="Tamaño" value={filters.size} onChange={(v) => updateFilter('size', v)}
                            options={[['', 'Cualquiera'], ['small', 'Chico'], ['medium', 'Mediano'], ['large', 'Grande']]} />
                        <SelectPill label="Sexo" value={filters.sex} onChange={(v) => updateFilter('sex', v)}
                            options={[['', 'Cualquiera'], ['male', 'Macho'], ['female', 'Hembra']]} />
                        <SelectPill label="Edad" value={filters.age_group} onChange={(v) => updateFilter('age_group', v)}
                            options={[['', 'Cualquiera'], ['puppy', 'Cachorro'], ['young', 'Joven'], ['adult', 'Adulto'], ['senior', 'Senior']]} />
                        <SelectPill label="Refugio" value={filters.shelter_id} onChange={(v) => updateFilter('shelter_id', v)}
                            options={[['', 'Todos'], ...shelters.map((s) => [String(s.id), s.name])]} />
                    </div>
                    <form onSubmit={submitCity} className="lg:ml-auto flex items-center gap-2.5 w-full lg:w-[380px] h-[52px] pl-4 pr-1.5 rounded-2xl bg-white border border-mimo-muted focus-within:border-mimo-noche">
                        <Search size={18} strokeWidth={2} className="shrink-0" />
                        <input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Ciudad (Montevideo, Salto…)"
                            aria-label="Ciudad"
                            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-mimo-noche/60"
                        />
                        <button type="submit" className="h-10 px-4 rounded-xl bg-mimo-noche text-mimo-warm text-[15px] font-bold">Buscar</button>
                    </form>
                </div>

                {!loading && !error && <Count>{total} {total === 1 ? 'resultado' : 'resultados'}</Count>}

                {loading ? (
                    <SkeletonGrid />
                ) : (
                    <CardGrid>
                        {error ? (
                            <EmptyState icon={PawPrint} color={SECTION.adopciones} title="No pudimos cargar las mascotas" text={error} />
                        ) : pets.length === 0 ? (
                            <EmptyState
                                icon={PawPrint}
                                color={SECTION.adopciones}
                                title="No encontramos mascotas"
                                text={hasFilters ? 'Probá con otros filtros u otra ciudad.' : 'Todavía no hay mascotas publicadas en adopción.'}
                                action={hasFilters && <OutlineButton onClick={resetFilters}>Limpiar filtros</OutlineButton>}
                            />
                        ) : (
                            pets.map((p) => <AdoptionCard key={p.id} pet={p} />)
                        )}
                    </CardGrid>
                )}

                {!loading && page < totalPages && (
                    <div className="flex justify-center mt-2">
                        <OutlineButton onClick={() => fetchPets(page + 1)} disabled={loadingMore}>
                            {loadingMore ? 'Cargando…' : 'Cargar más'}
                        </OutlineButton>
                    </div>
                )}
            </PageBody>
        </div>
    );
}
