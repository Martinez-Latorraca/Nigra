import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
const PAGE_LIMIT = 24;

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior', unknown: '—' };
const SEX_LABEL = { male: 'Macho', female: 'Hembra', unknown: '—' };

function AdoptionCard({ pet }) {
    const photo = pet.photos?.[0];
    const adopted = !!pet.adopted_at;
    return (
        <Link
            to={`/adoptions/${pet.id}`}
            className="group bg-mimo-warm rounded-[32px] overflow-hidden border border-mimo-muted transition-all hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)]"
        >
            <div className="relative aspect-[4/3] bg-mimo-muted overflow-hidden">
                {photo ? (
                    <img src={photo} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">🐾</div>
                )}
                {adopted ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="rounded-full bg-mimo-coral px-4 py-1.5 text-[10px] font-display font-extrabold uppercase tracking-widest text-white">
                            Adoptado
                        </span>
                    </div>
                ) : null}
                <span className="absolute top-3 left-3 bg-mimo-noche/80 text-white text-[9px] font-display font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full">
                    En adopción
                </span>
            </div>
            <div className="p-5">
                <h3 className="font-display font-black text-xl text-mimo-noche leading-tight truncate">
                    {pet.name || 'Sin nombre'}
                </h3>
                <p className="mt-1 text-[11px] text-mimo-quiet font-bold uppercase tracking-widest">
                    {SPECIES_LABEL[pet.species]}
                    {pet.size ? ` · ${SIZE_LABEL[pet.size]}` : ''}
                    {pet.age_group && pet.age_group !== 'unknown' ? ` · ${AGE_LABEL[pet.age_group]}` : ''}
                </p>
                <p className="mt-3 text-xs font-semibold text-mimo-ink truncate">
                    🏡 {pet.shelter_name}{pet.shelter_city ? ` · ${pet.shelter_city}` : ''}
                </p>
            </div>
        </Link>
    );
}

export default function Adoptions() {
    const [pets, setPets] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ species: '', sex: '', size: '', age_group: '', city: '' });

    const fetchPets = async (nextPage = 1, f = filters) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: nextPage, limit: PAGE_LIMIT });
            for (const [k, v] of Object.entries(f)) if (v) params.set(k, v);
            const res = await fetch(`${API}/api/adoption-pets?${params}`);
            const data = await res.json();
            if (res.ok) {
                setPets(data.pets || []);
                setTotal(data.total || 0);
                setPage(nextPage);
            }
        } catch {
            /* silencioso */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPets(1); /* eslint-disable-line */ }, []);

    const updateFilter = (k, v) => {
        const next = { ...filters, [k]: v };
        setFilters(next);
        fetchPets(1, next);
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

    return (
        <div className="min-h-screen bg-mimo-muted pb-20 font-sans text-mimo-noche">
            <div className="mx-auto w-full max-w-6xl px-6 pt-16">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mimo-quiet">
                    Refugios Mimo
                </span>
                <h1 className="mt-2 font-display font-black text-4xl md:text-6xl tracking-tight text-mimo-noche">
                    En adopción.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-mimo-ink">
                    Mascotas que están esperando una familia. Contactá al refugio directamente
                    para conocerlas.
                </p>

                {/* Filtros */}
                <div className="mt-10 flex flex-wrap gap-3">
                    <select
                        value={filters.species}
                        onChange={(e) => updateFilter('species', e.target.value)}
                        className="rounded-full border border-mimo-muted bg-mimo-warm px-4 py-2 text-xs font-bold text-mimo-ink focus:outline-none"
                    >
                        <option value="">Todos</option>
                        <option value="dog">Perros</option>
                        <option value="cat">Gatos</option>
                        <option value="other">Otros</option>
                    </select>
                    <select
                        value={filters.size}
                        onChange={(e) => updateFilter('size', e.target.value)}
                        className="rounded-full border border-mimo-muted bg-mimo-warm px-4 py-2 text-xs font-bold text-mimo-ink focus:outline-none"
                    >
                        <option value="">Cualquier tamaño</option>
                        <option value="small">Chico</option>
                        <option value="medium">Mediano</option>
                        <option value="large">Grande</option>
                    </select>
                    <select
                        value={filters.sex}
                        onChange={(e) => updateFilter('sex', e.target.value)}
                        className="rounded-full border border-mimo-muted bg-mimo-warm px-4 py-2 text-xs font-bold text-mimo-ink focus:outline-none"
                    >
                        <option value="">Cualquier sexo</option>
                        <option value="male">Macho</option>
                        <option value="female">Hembra</option>
                    </select>
                    <select
                        value={filters.age_group}
                        onChange={(e) => updateFilter('age_group', e.target.value)}
                        className="rounded-full border border-mimo-muted bg-mimo-warm px-4 py-2 text-xs font-bold text-mimo-ink focus:outline-none"
                    >
                        <option value="">Cualquier edad</option>
                        <option value="puppy">Cachorro</option>
                        <option value="young">Joven</option>
                        <option value="adult">Adulto</option>
                        <option value="senior">Senior</option>
                    </select>
                    <input
                        placeholder="Ciudad"
                        value={filters.city}
                        onChange={(e) => updateFilter('city', e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && updateFilter('city', filters.city)}
                        className="rounded-full border border-mimo-muted bg-mimo-warm px-4 py-2 text-xs font-bold text-mimo-ink focus:outline-none placeholder:text-mimo-quiet"
                    />
                </div>

                <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-mimo-quiet">
                    {loading ? 'Cargando…' : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pets.map((p) => <AdoptionCard key={p.id} pet={p} />)}
                </div>

                {!loading && pets.length === 0 ? (
                    <p className="mt-16 text-center text-sm text-mimo-quiet">
                        No encontramos mascotas con esos filtros.
                    </p>
                ) : null}

                {totalPages > 1 ? (
                    <div className="mt-10 flex justify-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => fetchPets(p)}
                                className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                                    p === page
                                        ? 'bg-mimo-noche text-white'
                                        : 'bg-mimo-warm text-mimo-ink hover:bg-mimo-muted'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
