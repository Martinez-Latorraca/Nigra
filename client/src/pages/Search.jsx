import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import MapSelector from '../components/MapSelector';
import SearchResultCard from '../components/SearchResultCard';
import LoadingCard from '../components/LoadingCard';

function Search() {
    const [finalBlob, setFinalBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [type, setType] = useState('dog');
    const [color, setColor] = useState('black');
    const [results, setResults] = useState([]);
    const [status, setStatus] = useState('found');
    const [position, setPosition] = useState(null);
    const [searchRatio, setSearchRatio] = useState(10);
    const [isAdLoading, setIsAdLoading] = useState(false);
    const [response, setResponse] = useState('');
    const resultsAnchorRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        return () => clearTimeout(searchTimeoutRef.current);
    }, []);

    const handleCropComplete = (blob, url) => {
        setFinalBlob(blob);
        const imagePreviewUrl = url || URL.createObjectURL(blob);
        setPreviewUrl(imagePreviewUrl);
    };

    const handleReset = () => {
        setFinalBlob(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setResults([]);
        setResponse('');
    };

    const handleSearch = async () => {
        if (!finalBlob || !position) {
            setResponse('Se requiere una fotografía y una ubicación en el mapa.');
            return;
        }

        setResponse('');
        setResults([]);
        setIsAdLoading(true);

        const searchStatus = status === 'lost' ? 'found' : 'lost';

        const formData = new FormData();
        formData.append('image', finalBlob);
        formData.append('status', searchStatus);
        formData.append('type', type);
        formData.append('color', color);
        formData.append('lat', position.lat);
        formData.append('lng', position.lng);
        formData.append('searchRatio', searchRatio);


        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/search-pet`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Error en la comunicación con el servidor');

                const data = await response.json();
                setResults(data);

                if (data.length === 0) {
                    setResponse('Sin coincidencias. Intenta ampliar el radio o ajustar el encuadre.');
                } else {
                    setResponse(`Se encontraron ${data.length} posibles coincidencias.`);
                }

                setTimeout(() => {
                    resultsAnchorRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 100);
            } catch (error) {
                console.error(error);
                setResponse('Error de conexión con el sistema.');
            } finally {
                setIsAdLoading(false);
            }
        }, 4000);
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans text-gray-900 flex flex-col items-center">

            {/* Navegación sutil */}
            <div className="w-full max-w-2xl mb-8 flex justify-between items-center px-2">
                <Link to="/" className="text-sm font-medium text-pet-link hover:text-pet-accent transition-colors">
                    Volver al inicio
                </Link>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900">Búsqueda visual.</h2>
            </div>

            <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] overflow-hidden p-8 md:p-12 border border-gray-100 relative">

                {/* --- CAPA SUPERPUESTA DE CARGA --- */}
                {isAdLoading && (
                    <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-md">
                        <LoadingCard />
                    </div>
                )}

                {/* Sección de Imagen */}
                <div className="mb-6 flex flex-col items-center">
                    {previewUrl ? (
                        <div className="relative group flex flex-col items-center">
                            <img
                                src={previewUrl}
                                alt="Mascota"
                                className="max-h-72 w-auto rounded-3xl shadow-sm border border-gray-100 object-cover"
                            />
                            <button
                                onClick={handleReset}
                                className="mt-6 px-6 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 font-semibold rounded-full transition-all text-[10px] uppercase tracking-widest"
                            >
                                Reemplazar imagen
                            </button>
                        </div>
                    ) : (
                        <div className="w-full p-12 border-2 border-dashed border-gray-100 rounded-[32px] bg-gray-50/50 text-center">
                            <ImageUploader onCropComplete={handleCropComplete} />
                        </div>
                    )}
                </div>

                <div className={`space-y-6 transition-all duration-500 ${finalBlob ? 'opacity-100 translate-y-0' : 'opacity-20 pointer-events-none translate-y-4'}`}>

                    {/* Filtros de clasificación */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">
                                Estado
                            </label>
                            <div className="relative group">
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 text-gray-900 font-medium outline-none focus:ring-4 focus:ring-gray-100 transition-all appearance-none cursor-pointer pr-12"
                                >
                                    <option value="found">Encontrado</option>
                                    <option value="lost">Perdido</option>
                                </select>
                                {/* Flecha personalizada estilo Apple */}
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">
                                Especie
                            </label>
                            <div className="relative group">
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 text-gray-900 font-medium outline-none focus:ring-4 focus:ring-gray-100 transition-all appearance-none cursor-pointer pr-12"
                                >
                                    <option value="dog">Perro</option>
                                    <option value="cat">Gato</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">
                                Color predominante
                            </label>
                            <div className="relative group">
                                <select
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 text-gray-900 font-medium outline-none focus:ring-4 focus:ring-gray-100 transition-all appearance-none cursor-pointer pr-12"
                                >
                                    <option value="black">Negro</option>
                                    <option value="white">Blanco</option>
                                    <option value="brown">Marrón</option>
                                    <option value="golden">Dorado / Rubio</option>
                                    <option value="mixed">Mixto</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mapa y Radio */}
                    <div className="space-y-4">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">Punto de referencia</label>
                        <div className="rounded-[32px] overflow-hidden border border-gray-100 shadow-inner">
                            <MapSelector position={position} setPosition={setPosition} />
                        </div>


                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-fade-in">
                            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Radio</span>
                            <select
                                value={searchRatio}
                                onChange={(e) => setSearchRatio(e.target.value)}
                                className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
                            >
                                <option value="5">5 kilómetros</option>
                                <option value="10">10 kilómetros</option>
                                <option value="20">20 kilómetros</option>
                                <option value="50">50 kilómetros</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                    </div>

                    <button
                        disabled={!finalBlob || !position || isAdLoading}
                        onClick={handleSearch}
                        className="w-full py-5 bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold rounded-full transition-all duration-300 shadow-sm text-lg mt-8"
                    >
                        Ejecutar búsqueda visual
                    </button>
                </div>

                <div ref={resultsAnchorRef} className="h-1" />

                {response && (
                    <div className="mt-8 text-center text-[10px] font-bold text-green-500 uppercase tracking-[0.2em] animate-fade-in">
                        {response}
                    </div>
                )}
            </div>

            {/* Resultados */}
            <div className="w-full max-w-4xl flex flex-col gap-6 mt-12 mb-20">
                {results.map(pet => (
                    <SearchResultCard key={pet.id} pet={pet} />
                ))}
            </div>
        </div>
    );
}

export default Search;