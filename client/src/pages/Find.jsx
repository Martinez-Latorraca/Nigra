import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, LocateFixed, Check, CircleAlert, X, Plus, Send, MapPin, ArrowUpRight, Dog, Cat, ChevronRight } from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import MapSelector from '../components/MapSelector';
import AddressSearch from '../components/AddressSearch';
import SearchingOverlay from '../components/SearchingOverlay';
import { StatusChip } from '../components/ui';
import { C, STATUS } from '../utils/theme';
import { translateColor, translateType } from '../utils/translations';

// Radio generoso para la pre-búsqueda: preferimos mostrar de más que perder un match.
const SEARCH_RADIUS_KM = 50;
const MAX_EXTRA = 5; // tope del servidor para extra_images

const TYPES = [['dog', 'Perro'], ['cat', 'Gato']];

// Muestrita de color de cada opción (igual que en la app).
const COLORS = [
    { value: 'black', label: 'Negro', bg: '#1F1F1F' },
    { value: 'white', label: 'Blanco', bg: '#FFFFFF' },
    { value: 'brown', label: 'Marrón', bg: '#7A4A2A' },
    { value: 'golden', label: 'Dorado', bg: '#D9A441' },
    { value: 'mixed', label: 'Mixto', bg: 'linear-gradient(135deg, #1F1F1F 50%, #FFFFFF 50%)' },
    { value: 'orange', label: 'Naranja', bg: '#E07B2E' },
    { value: 'grey', label: 'Gris', bg: '#9A9AA5' },
    { value: 'spotted', label: 'Manchado', bg: 'radial-gradient(circle at 30% 35%, #1F1F1F 22%, transparent 24%), radial-gradient(circle at 70% 70%, #1F1F1F 18%, transparent 20%), #FFFFFF' },
    { value: 'striped', label: 'Atigrado', bg: 'repeating-linear-gradient(45deg, #7A4A2A 0 3px, #D9A441 3px 6px)' },
];

const label = 'm-0 text-xs font-bold tracking-[.08em] uppercase';
const fieldBox = 'w-full px-4 rounded-2xl bg-white border border-mimo-muted focus:border-mimo-noche outline-none text-[15px] placeholder:text-mimo-noche/60';

const STEPS = { form: [1, 'Buscar'], results: [2, 'Coincidencias'], report: [3, 'Publicar'] };

function StepBand({ step, title, subtitle }) {
    const [n, name] = STEPS[step];
    return (
        <section className="bg-mimo-coral text-mimo-muted rounded-b-[32px] md:rounded-b-[48px] px-4 md:px-12 xl:px-[120px] pt-8 md:pt-10 pb-9 md:pb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10">
            <div className="flex flex-col gap-2.5 max-w-[760px]">
                <h1 className="m-0 font-display font-black text-[40px] md:text-[52px] leading-[1.05]">{title}</h1>
                <p className="m-0 text-base md:text-lg leading-normal">{subtitle}</p>
            </div>
            <div className="w-full md:w-[360px] flex flex-col gap-2 shrink-0">
                <div className="flex gap-1.5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i <= n ? C.arena : 'rgba(255,255,255,.3)' }} />
                    ))}
                </div>
                <span className="text-[13px] font-bold tracking-[.08em] uppercase">Paso {n} de 3 · {name}</span>
            </div>
        </section>
    );
}

// `swatch`: pastilla de color (muestrita a la izquierda, un poco más baja).
function Pill({ active, onClick, swatch, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex items-center gap-2 rounded-full transition-colors ${
                active ? 'bg-mimo-noche text-mimo-warm font-bold' : 'bg-white border border-mimo-muted hover:border-mimo-noche'
            } ${swatch ? 'h-[42px] pl-2 pr-3.5 text-sm' : 'h-11 px-[18px] text-[15px]'}`}
        >
            {children}
        </button>
    );
}

function MatchCard({ pet }) {
    const pct = pet.visual_distance !== undefined ? Math.max(0, Math.min(100, Math.round((1 - pet.visual_distance) * 100))) : null;
    const status = STATUS[pet.status === 'lost' ? 'lost' : 'found'];
    const barrio = pet.address ? String(pet.address).split(',')[0].trim() : '';
    const dist = pet.distance_km != null ? `a ${parseFloat(pet.distance_km).toFixed(1).replace('.', ',')} km` : '';
    const SpeciesIcon = pet.type === 'cat' ? Cat : Dog;
    return (
        <Link to={`/pet/${pet.id}`} className="group bg-white rounded-3xl p-3 flex flex-col gap-2.5 hover:shadow-card transition-shadow">
            <div className="relative h-[200px] rounded-[18px] bg-mimo-muted overflow-hidden flex items-center justify-center">
                {pet.photo_url ? (
                    <img src={pet.photo_url} alt={translateType(pet.type) || 'Mascota'} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <SpeciesIcon size={56} strokeWidth={1.5} color={C.noche} opacity={0.35} />
                )}
                <span className="absolute top-2.5 left-2.5"><StatusChip color={status.color} small>{status.label}</StatusChip></span>
            </div>
            <div className="px-1.5 pb-1.5 flex flex-col gap-1.5">
                {pct !== null && (
                    <>
                        <span className="flex items-baseline gap-1.5">
                            <b className="font-display font-black text-[30px] leading-none">{pct}%</b>
                            <span className="text-sm font-bold">de parecido</span>
                        </span>
                        <div className="h-2 rounded-full bg-mimo-muted overflow-hidden">
                            <div className="h-full bg-mimo-coral" style={{ width: `${pct}%` }} />
                        </div>
                    </>
                )}
                {(barrio || dist) && (
                    <span className="flex items-center gap-1 text-sm">
                        <MapPin size={14} strokeWidth={2} className="shrink-0" />
                        {[barrio, dist].filter(Boolean).join(' · ')}
                    </span>
                )}
                <span className="mt-1.5 pt-2.5 border-t border-mimo-muted flex justify-end items-center gap-0.5 text-sm font-bold group-hover:text-mimo-coral">
                    Contactar <ArrowUpRight size={14} strokeWidth={2} />
                </span>
            </div>
        </Link>
    );
}

function Find() {
    const token = useSelector((state) => state.user?.token);
    const navigate = useNavigate();

    const [step, setStep] = useState('form'); // 'form' | 'results' | 'report'
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    // Datos para buscar
    const [situation, setSituation] = useState('lost');
    const [finalBlob, setFinalBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [type, setType] = useState('dog');
    const [color, setColor] = useState('black');
    const [position, setPosition] = useState(null);
    const [placeName, setPlaceName] = useState('');
    const [locating, setLocating] = useState(false);

    const [matches, setMatches] = useState([]);

    // Datos extra solo para el reporte
    const [extraFiles, setExtraFiles] = useState([]);
    const [extraPreviews, setExtraPreviews] = useState([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [contactInfo, setContactInfo] = useState('');

    const isLost = situation === 'lost';

    useEffect(() => {
        if (!token) navigate('/login');
    }, [token, navigate]);

    const goTo = (next) => {
        setError('');
        setStep(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCropComplete = (blob) => {
        setFinalBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
    };

    const handleResetImage = () => {
        setFinalBlob(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const handleExtraImages = (e) => {
        const room = MAX_EXTRA - extraFiles.length;
        const files = Array.from(e.target.files || []).slice(0, room);
        setExtraFiles((prev) => [...prev, ...files]);
        setExtraPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
        e.target.value = '';
    };

    const removeExtraImage = (i) => {
        setExtraFiles((prev) => prev.filter((_, idx) => idx !== i));
        setExtraPreviews((prev) => {
            URL.revokeObjectURL(prev[i]);
            return prev.filter((_, idx) => idx !== i);
        });
    };

    const handleMyLocation = () => {
        if (!navigator.geolocation) {
            setError('Tu navegador no permite usar la ubicación. Marcá el punto en el mapa.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setPlaceName('');
                setLocating(false);
            },
            () => {
                setLocating(false);
                setError('No pudimos obtener tu ubicación. Buscá la dirección o marcá el punto en el mapa.');
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60 * 1000 }
        );
    };

    const handleSearch = async () => {
        if (!finalBlob || !position) {
            setError(!finalBlob ? 'Agregá la foto para poder buscar.' : 'Marcá en el mapa dónde fue.');
            return;
        }
        setError('');
        setBusy(true);
        // Buscamos en el pool opuesto: si la perdí, busco entre las encontradas.
        const formData = new FormData();
        formData.append('image', finalBlob);
        formData.append('status', isLost ? 'found' : 'lost');
        formData.append('type', type);
        formData.append('color', color);
        formData.append('lat', position.lat);
        formData.append('lng', position.lng);
        formData.append('searchRatio', SEARCH_RADIUS_KM);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/search-pet`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error();
            const data = await res.json();
            const found = Array.isArray(data) ? data : [];
            setMatches(found);
            goTo(found.length > 0 ? 'results' : 'report');
        } catch {
            setError('No pudimos buscar coincidencias. Probá de nuevo en un rato.');
        } finally {
            setBusy(false);
        }
    };

    const handleReport = async () => {
        if (!finalBlob || !contactInfo.trim() || !position) {
            setError('Faltan datos: la foto, el contacto y la ubicación son obligatorios.');
            return;
        }
        setBusy(true);
        setError('');
        const formData = new FormData();
        formData.append('image', finalBlob);
        extraFiles.forEach((f) => formData.append('extra_images', f));
        formData.append('type', type);
        formData.append('color', color);
        formData.append('status', situation); // se publica en su propio pool
        formData.append('contact_info', contactInfo);
        formData.append('description', description || 'Desconocido');
        formData.append('lat', position.lat);
        formData.append('lng', position.lng);
        if (isLost) formData.append('name', name);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/report-pet`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    navigate('/login');
                    throw new Error('Tu sesión venció. Volvé a entrar.');
                }
                throw new Error(data.error || 'No pudimos publicar el reporte.');
            }
            navigate(`/pet/${data.pet.id}`);
        } catch (e) {
            setError(e.message || 'No pudimos publicar el reporte. Probá de nuevo.');
            setBusy(false);
        }
    };

    const errorBox = error && (
        <p className="m-0 flex items-start gap-2.5 p-4 rounded-[20px] bg-white text-[15px] leading-[1.45] text-mimo-coral font-bold" role="alert">
            <CircleAlert size={20} strokeWidth={2} className="shrink-0 mt-px" />
            {error}
        </p>
    );

    const meta = [translateType(type), translateColor(color)].filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    const barrio = placeName ? placeName.split(',')[0].trim() : '';

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            {busy && (
                <SearchingOverlay
                    title={step === 'report' ? 'Publicando el reporte…' : 'Buscando coincidencias…'}
                    audience={situation}
                />
            )}

            {/* ─── PASO 1: datos para buscar ─── */}
            {step === 'form' && (
                <>
                    <StepBand step="form" title="Perdí / Encontré" subtitle="Subí una foto y la buscamos entre los reportes cercanos." />
                    <main className="w-full max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-9 pb-20 flex flex-col lg:flex-row gap-8 items-start">
                        <div className="w-full lg:flex-[0_0_480px] flex flex-col gap-3.5">
                            <p className={label}>Foto de la mascota</p>
                            <ImageUploader onCropComplete={handleCropComplete} previewUrl={previewUrl} onReset={handleResetImage} />
                        </div>

                        <div className="w-full flex-1 min-w-0 flex flex-col gap-6">
                            <section className="flex flex-col gap-2.5">
                                <p className={label}>Tu situación</p>
                                <div className="grid grid-cols-2 gap-2 p-[5px] rounded-[20px] bg-mimo-muted">
                                    {[['lost', 'Perdí mi mascota'], ['found', 'Encontré una']].map(([value, text]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setSituation(value)}
                                            aria-pressed={situation === value}
                                            className={`h-[50px] rounded-[15px] text-[15px] transition-colors ${situation === value ? 'bg-mimo-noche text-mimo-warm font-bold' : 'hover:bg-white/60'}`}
                                        >
                                            {text}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="flex flex-col gap-2.5">
                                <p className={label}>Especie</p>
                                <div className="flex gap-2">
                                    {TYPES.map(([value, text]) => (
                                        <Pill key={value} active={type === value} onClick={() => setType(value)}>{text}</Pill>
                                    ))}
                                </div>
                            </section>

                            <section className="flex flex-col gap-2.5">
                                <p className={label}>Color predominante</p>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map((col) => (
                                        <Pill key={col.value} active={color === col.value} onClick={() => setColor(col.value)} swatch>
                                            <span className="w-6 h-6 rounded-full border border-mimo-noche/15 shrink-0" style={{ background: col.bg }} />
                                            {col.label}
                                        </Pill>
                                    ))}
                                </div>
                            </section>

                            <section className="flex flex-col gap-2.5">
                                <p className={label}>{isLost ? '¿Dónde se perdió?' : '¿Dónde la encontraste?'}</p>
                                <div className="flex flex-col sm:flex-row gap-2.5">
                                    <AddressSearch
                                        onSelect={(lat, lng, text) => {
                                            setPosition({ lat, lng });
                                            setPlaceName(text || '');
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleMyLocation}
                                        disabled={locating}
                                        className="h-[52px] px-5 rounded-2xl border-2 border-mimo-noche font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-white disabled:opacity-60 whitespace-nowrap"
                                    >
                                        <LocateFixed size={18} strokeWidth={2} />
                                        {locating ? 'Ubicando…' : 'Usar mi ubicación'}
                                    </button>
                                </div>
                                <MapSelector position={position} setPosition={(p) => { setPosition(p); setPlaceName(''); }} />
                                {position && (
                                    <p className="m-0 flex items-center gap-2 text-[15px] font-bold">
                                        <span className="w-5 h-5 rounded-full bg-mimo-teal flex items-center justify-center">
                                            <Check size={12} strokeWidth={3} color={C.noche} />
                                        </span>
                                        Ubicación seleccionada
                                    </p>
                                )}
                            </section>

                            {errorBox}

                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    disabled={!finalBlob || busy}
                                    className="h-[58px] px-[22px] rounded-[18px] bg-mimo-noche text-mimo-warm font-bold text-base flex items-center justify-center gap-2 hover:bg-mimo-nocheAlt disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <Search size={18} strokeWidth={2} />
                                    Buscar coincidencias
                                </button>
                                {!finalBlob && <span className="text-[15px]">Agregá la foto para poder buscar.</span>}
                                {finalBlob && !position && <span className="text-[15px]">Marcá en el mapa dónde fue.</span>}
                            </div>
                        </div>
                    </main>
                </>
            )}

            {/* ─── PASO 2: candidatas ─── */}
            {step === 'results' && (
                <>
                    <StepBand
                        step="results"
                        title="Posibles coincidencias"
                        subtitle={isLost
                            ? 'Estas mascotas fueron reportadas como encontradas. ¿Alguna es la tuya?'
                            : 'Estas mascotas fueron reportadas como perdidas. ¿Alguna es la que encontraste?'}
                    />
                    <main className="px-4 md:px-12 xl:px-[120px] pt-9 pb-20 flex flex-col gap-7">
                        <div className="flex items-center gap-4 p-3.5 rounded-[22px] bg-white">
                            {previewUrl && <img src={previewUrl} alt="Tu foto" className="w-16 h-16 rounded-2xl object-cover shrink-0" />}
                            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <p className={label}>Tu búsqueda</p>
                                <b className="text-[17px] truncate">{[...meta, barrio].filter(Boolean).join(' · ')}</b>
                            </span>
                            <button type="button" onClick={() => goTo('form')} className="text-[15px] font-bold underline hover:text-mimo-coral">Editar</button>
                        </div>

                        <p className="m-0 text-base">
                            {isLost
                                ? 'Tocá una para contactar a quien la encontró. Están ordenadas por parecido.'
                                : 'Tocá una para contactar a su familia. Están ordenadas por parecido.'}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {matches.map((pet) => <MatchCard key={pet.id} pet={pet} />)}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-6 rounded-3xl bg-white">
                            <span className="text-base">¿Ninguna es {isLost ? 'tu mascota' : 'la que encontraste'}?</span>
                            <button
                                type="button"
                                onClick={() => goTo('report')}
                                className="h-[52px] px-[22px] rounded-2xl bg-mimo-coral text-mimo-muted font-bold text-[15px] flex items-center gap-2 hover:bg-mimo-coralDark"
                            >
                                <ChevronRight size={18} strokeWidth={2} />
                                Publicar reporte
                            </button>
                        </div>
                    </main>
                </>
            )}

            {/* ─── PASO 3: completar reporte ─── */}
            {step === 'report' && (
                <>
                    <StepBand step="report" title="Publicar reporte" subtitle="Completá los datos para que la comunidad pueda ayudarte." />
                    <main className="w-full max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-9 pb-20 flex flex-col lg:flex-row gap-8 items-start">
                        <div className="w-full lg:flex-[0_0_480px] flex flex-col gap-4">
                            <p className={label}>Foto principal</p>
                            <ImageUploader onCropComplete={handleCropComplete} previewUrl={previewUrl} onReset={handleResetImage} />

                            <div className="flex justify-between items-center mt-1">
                                <p className={label}>Más fotos</p>
                                <b className="text-[13px]">{extraFiles.length} / {MAX_EXTRA}</b>
                            </div>
                            <p className="m-0 text-sm leading-[1.45]">
                                Cuantas más fotos subas (distintos ángulos y luz), más fácil es reconocerla. Recomendado: 3 o 4.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {extraPreviews.map((url, i) => (
                                    <div key={url} className="relative w-24 h-24 rounded-[18px] bg-mimo-muted">
                                        <img src={url} alt={`Foto ${i + 2}`} className="w-full h-full object-cover rounded-[18px]" />
                                        <button
                                            type="button"
                                            onClick={() => removeExtraImage(i)}
                                            aria-label={`Quitar foto ${i + 2}`}
                                            className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-mimo-noche border-2 border-mimo-warm flex items-center justify-center"
                                        >
                                            <X size={14} strokeWidth={2.5} color={C.crema} />
                                        </button>
                                    </div>
                                ))}
                                {extraFiles.length < MAX_EXTRA && (
                                    <label className="w-24 h-24 rounded-[18px] border-2 border-dashed border-mimo-coral bg-white flex items-center justify-center cursor-pointer hover:bg-mimo-warm" aria-label="Agregar fotos">
                                        <Plus size={26} strokeWidth={2} />
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleExtraImages} />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="w-full flex-1 min-w-0 flex flex-col gap-5">
                            {matches.length === 0 && (
                                <p className="m-0 flex items-start gap-2.5 p-4 rounded-[20px] bg-white text-[15px] leading-[1.45]">
                                    <CircleAlert size={20} strokeWidth={2} className="shrink-0 mt-px text-mimo-coral" />
                                    No encontramos coincidencias por ahora. Publicá el reporte así queda visible para la comunidad.
                                </p>
                            )}

                            {isLost && (
                                <label className="flex flex-col gap-1.5">
                                    <span className={label}>Nombre</span>
                                    <input type="text" placeholder="Nombre de la mascota" value={name} onChange={(e) => setName(e.target.value)} className={`${fieldBox} h-[52px]`} />
                                </label>
                            )}

                            <label className="flex flex-col gap-1.5">
                                <span className={label}>Descripción</span>
                                <textarea
                                    placeholder="Señas particulares, zona, detalles"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className={`${fieldBox} py-3.5 resize-y`}
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className={label}>Contacto <span className="text-mimo-coral">*</span></span>
                                <input type="text" placeholder="Teléfono o WhatsApp" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} className={`${fieldBox} h-[52px]`} required />
                            </label>

                            {errorBox}

                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleReport}
                                    disabled={!finalBlob || !contactInfo.trim() || !position || busy}
                                    className="h-[58px] px-[22px] rounded-[18px] bg-mimo-noche text-mimo-warm font-bold text-base flex items-center justify-center gap-2 hover:bg-mimo-nocheAlt disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <Send size={18} strokeWidth={2} />
                                    Publicar reporte
                                </button>
                                <button type="button" onClick={() => goTo('form')} className="h-[58px] px-4 text-[15px] font-bold underline hover:text-mimo-coral">
                                    Volver
                                </button>
                            </div>
                        </div>
                    </main>
                </>
            )}
        </div>
    );
}

export default Find;
