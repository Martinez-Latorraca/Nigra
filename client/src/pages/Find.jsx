import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ImageUploader from '../components/ImageUploader';
import MapSelector from '../components/MapSelector';
import SearchResultCard from '../components/SearchResultCard';
import LoadingCard from '../components/LoadingCard';
import PetSpinner from '../components/PetSpinner';

// Radio generoso para la pre-búsqueda: preferimos mostrar de más que perder un match.
const SEARCH_RADIUS_KM = 50;

const selectClass =
    'w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 text-gray-900 font-medium outline-none focus:ring-4 focus:ring-gray-100 transition-all appearance-none cursor-pointer pr-12';
const inputClass =
    'w-full px-5 py-4 bg-gray-50 text-gray-900 rounded-2xl border border-gray-100 focus:bg-white focus:ring-4 focus:ring-gray-100 outline-none transition-all font-medium';
const labelClass = 'block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1';
const Chevron = () => (
    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
    </div>
);

function Find() {
    const token = useSelector((state) => state.user?.token);
    const navigate = useNavigate();

    const [step, setStep] = useState('form'); // 'form' | 'results' | 'report'
    const [busy, setBusy] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    // Datos para buscar
    const [situation, setSituation] = useState('lost');
    const [finalBlob, setFinalBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [type, setType] = useState('dog');
    const [color, setColor] = useState('black');
    const [position, setPosition] = useState(null);

    // Resultado de la pre-búsqueda
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

    const handleCropComplete = (blob, url) => {
        setFinalBlob(blob);
        setPreviewUrl(url || URL.createObjectURL(blob));
    };

    const handleResetImage = () => {
        setFinalBlob(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const handleExtraImages = (e) => {
        const files = Array.from(e.target.files);
        const previews = files.map((f) => URL.createObjectURL(f));
        setExtraFiles((prev) => [...prev, ...files]);
        setExtraPreviews((prev) => [...prev, ...previews]);
    };

    const removeExtraImage = (i) => {
        setExtraFiles((prev) => prev.filter((_, idx) => idx !== i));
        setExtraPreviews((prev) => {
            URL.revokeObjectURL(prev[i]);
            return prev.filter((_, idx) => idx !== i);
        });
    };

    const handleSearch = async () => {
        if (!finalBlob || !position) {
            setError('Se requiere una fotografía y una ubicación en el mapa.');
            return;
        }
        setError('');
        setBusy(true);
        // Buscamos en el pool opuesto: si la perdí, busco entre las encontradas.
        const searchStatus = isLost ? 'found' : 'lost';
        const formData = new FormData();
        formData.append('image', finalBlob);
        formData.append('status', searchStatus);
        formData.append('type', type);
        formData.append('color', color);
        formData.append('lat', position.lat);
        formData.append('lng', position.lng);
        formData.append('searchRatio', SEARCH_RADIUS_KM);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/search-pet`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error('Error en la comunicación con el servidor');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setMatches(data);
                setStep('results');
            } else {
                setMatches([]);
                setStep('report');
            }
        } catch (e) {
            console.error(e);
            setError('Error de conexión con el sistema.');
        } finally {
            setBusy(false);
        }
    };

    const handleReport = async () => {
        if (!finalBlob || !contactInfo || !position) {
            setError('Faltan campos obligatorios: imagen, contacto y ubicación.');
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
                    throw new Error('Sesión expirada.');
                }
                throw new Error(data.error || 'Error al reportar');
            }
            setBusy(false);
            setIsSuccess(true);
            setTimeout(() => navigate(`/pet/${data.pet.id}`), 3000);
        } catch (e) {
            console.error(e);
            setError(e.message);
            setBusy(false);
        }
    };

    const headerTitle =
        step === 'results' ? 'Posibles coincidencias.' : step === 'report' ? 'Publicar reporte.' : 'Perdí / Encontré.';

    return (
        <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans text-gray-900 flex flex-col items-center">
            <div className="w-full max-w-2xl mb-8 flex justify-between items-center px-2">
                {step === 'form' ? (
                    <Link to="/" className="text-sm font-medium text-pet-link hover:text-pet-accent transition-colors">
                        Volver al inicio
                    </Link>
                ) : (
                    <button
                        onClick={() => { setError(''); setStep('form'); }}
                        className="text-sm font-medium text-pet-link hover:text-pet-accent transition-colors"
                    >
                        ‹ Volver
                    </button>
                )}
                <h2 className="text-xl font-semibold tracking-tight text-gray-900">{headerTitle}</h2>
            </div>

            <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] overflow-hidden p-8 md:p-12 border border-gray-100 relative min-h-[500px]">

                {/* Overlay de éxito */}
                {isSuccess && (
                    <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-10 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-8">
                            <PetSpinner />
                        </div>
                        <h2 className="text-4xl font-semibold tracking-tighter text-black mb-4">Reporte enviado.</h2>
                        <p className="text-gray-400 font-medium mb-12 max-w-xs leading-relaxed">
                            Tu reporte ya está activo en Nigra. Te avisaremos si aparece una coincidencia.
                        </p>
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest animate-pulse">
                            Redirigiendo...
                        </span>
                    </div>
                )}

                {/* Overlay de carga */}
                {busy && (
                    <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-md">
                        <LoadingCard />
                    </div>
                )}

                {/* ─── PASO 1: datos para buscar ─── */}
                {step === 'form' && (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <label className={labelClass}>Tu situación</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'lost', label: 'Perdí mi mascota' },
                                    { value: 'found', label: 'Encontré una mascota' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSituation(opt.value)}
                                        className={`py-4 rounded-2xl font-semibold text-sm transition-all border ${
                                            situation === opt.value
                                                ? 'bg-black text-white border-black'
                                                : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <p className="text-gray-400 font-medium text-sm text-center leading-relaxed max-w-sm mx-auto mb-6">
                                Subí una foto de la cara del animal y recortala dejando solo las orejas y el hocico.
                                Es lo que mejor lo distingue para el match.
                            </p>
                            <ImageUploader
                                onCropComplete={handleCropComplete}
                                previewUrl={previewUrl}
                                onReset={handleResetImage}
                            />
                        </div>

                        <div
                            className={`space-y-8 transition-all duration-500 ${
                                finalBlob ? 'opacity-100 translate-y-0' : 'opacity-20 pointer-events-none translate-y-4'
                            }`}
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className={labelClass}>Especie</label>
                                    <div className="relative group">
                                        <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
                                            <option value="dog">Perro</option>
                                            <option value="cat">Gato</option>
                                        </select>
                                        <Chevron />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className={labelClass}>Color predominante</label>
                                    <div className="relative group">
                                        <select value={color} onChange={(e) => setColor(e.target.value)} className={selectClass}>
                                            <option value="black">Negro</option>
                                            <option value="white">Blanco</option>
                                            <option value="brown">Marrón</option>
                                            <option value="golden">Dorado / Rubio</option>
                                            <option value="mixed">Mixto</option>
                                            <option value="orange">Naranja</option>
                                            <option value="grey">Gris</option>
                                            <option value="spotted">Manchado</option>
                                            <option value="striped">Atigrado</option>
                                        </select>
                                        <Chevron />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className={labelClass}>
                                    {isLost ? '¿Dónde se perdió?' : '¿Dónde la encontraste?'}
                                </label>
                                <div className="rounded-[32px] overflow-hidden border border-gray-100 shadow-inner">
                                    <MapSelector position={position} setPosition={setPosition} />
                                </div>
                            </div>

                            <button
                                disabled={!finalBlob || !position || busy}
                                onClick={handleSearch}
                                className="w-full py-5 bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold rounded-full transition-all duration-300 shadow-sm text-lg"
                            >
                                Buscar coincidencias
                            </button>
                        </div>

                        {error && (
                            <div className="text-center text-xs font-semibold text-red-400 uppercase tracking-widest animate-fade-in">
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── PASO 2: candidatas ─── */}
                {step === 'results' && (
                    <div className="space-y-8">
                        <p className="text-gray-500 font-medium leading-relaxed">
                            {isLost
                                ? 'Estas mascotas fueron reportadas como encontradas. ¿Alguna es la tuya? Abrila para contactar a quien la encontró.'
                                : 'Estas mascotas fueron reportadas como perdidas. ¿Alguna es la que encontraste? Abrila para contactar a su dueño.'}
                        </p>
                        <div className="flex flex-col gap-6">
                            {matches.map((pet) => (
                                <SearchResultCard key={pet.id} pet={pet} />
                            ))}
                        </div>
                        <button
                            onClick={() => setStep('report')}
                            className="w-full py-5 border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold rounded-full transition-all"
                        >
                            Ninguna es {isLost ? 'mi mascota' : 'la que encontré'} → Publicar reporte
                        </button>
                    </div>
                )}

                {/* ─── PASO 3: completar reporte ─── */}
                {step === 'report' && (
                    <div className="space-y-8">
                        <p
                            className={`font-medium leading-relaxed ${
                                matches.length === 0 ? 'text-red-500 font-semibold' : 'text-gray-500'
                            }`}
                        >
                            {matches.length === 0
                                ? 'No encontramos coincidencias por ahora. Publicá el reporte así queda visible para la comunidad.'
                                : 'Completá los datos para publicar el reporte.'}
                        </p>

                        <div className="flex flex-col items-center">
                            {previewUrl ? (
                                <div className="flex flex-col items-center">
                                    <img
                                        src={previewUrl}
                                        alt="Mascota"
                                        className="max-h-72 w-auto rounded-3xl shadow-sm object-cover border border-gray-100"
                                    />
                                    <button
                                        onClick={handleResetImage}
                                        className="mt-6 px-6 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 font-semibold rounded-full transition-all text-[10px] uppercase tracking-widest"
                                    >
                                        Cambiar fotografía
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full p-12 border-2 border-dashed border-gray-100 rounded-[32px] bg-gray-50/50">
                                    <ImageUploader onCropComplete={handleCropComplete} />
                                </div>
                            )}
                        </div>

                        {/* Galería extra */}
                        <div className="space-y-4">
                            <label className={labelClass}>Galería de confirmación (opcional)</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                {extraPreviews.map((url, index) => (
                                    <div key={index} className="relative aspect-square group">
                                        <img src={url} className="w-full h-full object-cover rounded-2xl border border-gray-100 shadow-sm" alt="Extra" />
                                        <button
                                            onClick={() => removeExtraImage(index)}
                                            className="absolute -top-2 -right-2 bg-white text-black w-6 h-6 rounded-full shadow-md flex items-center justify-center text-xs hover:bg-black hover:text-white transition-all"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <label className="aspect-square border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all text-gray-300 hover:text-gray-500">
                                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-[10px] font-bold uppercase">Añadir</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleExtraImages} />
                                </label>
                            </div>
                        </div>

                        {isLost && (
                            <div className="space-y-2">
                                <label className={labelClass}>Nombre</label>
                                <input
                                    type="text"
                                    placeholder="Nombre de la mascota"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className={labelClass}>Descripción</label>
                            <input
                                type="text"
                                placeholder="Señas particulares o zona exacta"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className={inputClass}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={labelClass}>Contacto obligatorio</label>
                            <input
                                type="text"
                                placeholder="Teléfono o WhatsApp"
                                value={contactInfo}
                                onChange={(e) => setContactInfo(e.target.value)}
                                className={inputClass}
                            />
                        </div>

                        <button
                            disabled={!finalBlob || !contactInfo || !position || busy}
                            onClick={handleReport}
                            className="w-full py-5 bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold rounded-full transition-all duration-300 shadow-sm text-lg"
                        >
                            Publicar reporte
                        </button>

                        {error && (
                            <div className="text-center text-xs font-semibold text-red-400 uppercase tracking-widest animate-fade-in">
                                {error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Find;
