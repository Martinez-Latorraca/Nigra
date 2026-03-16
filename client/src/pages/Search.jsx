import { useState } from 'react';
import { Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import PetCard from '../components/PetCard';
import MapSelector from '../components/MapSelector';

function Search() {
    const [finalBlob, setFinalBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [type, setType] = useState('dog');
    const [color, setColor] = useState('black');
    const [status, setStatus] = useState('');
    const [results, setResults] = useState([]);
    const [position, setPosition] = useState(null);

    // 1. NUEVO ESTADO: Controla la pantalla de carga con publicidad
    const [isAdLoading, setIsAdLoading] = useState(false);

    const handleCropComplete = (blob, url) => {
        setFinalBlob(blob);
        // Si el uploader nos pasa una URL la usamos, si no, LA CREAMOS nosotros mismos a partir del blob.
        const imagePreviewUrl = url || URL.createObjectURL(blob);
        setPreviewUrl(imagePreviewUrl);
    };

    const handleReset = () => {
        setFinalBlob(null);
        // Buena práctica: liberar la memoria del navegador borrando la URL temporal
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setResults([]);
        setStatus('');
    };

    const handleSearch = async () => {
        if (!finalBlob) return;

        // Limpiamos resultados previos y encendemos la pantalla de carga
        setStatus('');
        setResults([]);
        setIsAdLoading(true);

        const formData = new FormData();
        formData.append('image', finalBlob);
        formData.append('type', type);
        formData.append('color', color);

        if (position) {
            formData.append('lat', position.lat);
            formData.append('lng', position.lng);
        }

        console.log(position);

        // 2. EL TRUCO: Un temporizador de 4 segundos antes de ejecutar tu código real
        setTimeout(async () => {
            try {
                // Le pegamos a la ruta de tu backend
                const response = await fetch('http://localhost:3000/api/pets/search-pet', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Error en la búsqueda');

                const data = await response.json();
                setResults(data);

                if (data.length === 0) {
                    setStatus('⚠️ No encontramos coincidencias. Intenta recortar más cerca o cambiar filtros.');
                } else {
                    setStatus(`✅ ¡Encontramos ${data.length} posible(s) coincidencia(s)!`);
                }
            } catch (error) {
                console.error(error);
                setStatus('❌ Error al conectar con el servidor.');
            } finally {
                // 3. APAGAMOS LA PANTALLA DE CARGA al terminar todo
                setIsAdLoading(false);
            }
        }, 4000);
    };

    return (
        <div className="min-h-screen bg-pet-light p-4 font-sans text-pet-dark flex flex-col items-center">

            {/* Navegación simple */}
            <div className="w-full max-w-xl mb-4 flex justify-between items-center">
                <Link to="/" className="text-pet-primary hover:text-pet-primaryDark font-bold flex items-center gap-2 transition-colors">
                    <span>←</span> Volver al inicio
                </Link>
                <h2 className="text-xl font-extrabold text-pet-primaryDark">🔍 Buscar Mascota</h2>
            </div>

            {/* Agregamos 'relative' aquí para que la capa superpuesta no se escape de la tarjeta */}
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 border-t-8 border-pet-primary relative">

                {/* --- CAPA SUPERPUESTA DE CARGA Y PUBLICIDAD --- */}
                {isAdLoading && (
                    <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pet-primary mb-4"></div>
                        <h3 className="text-xl font-bold text-pet-primaryDark animate-pulse text-center">
                            La IA está escaneando los vectores faciales...
                        </h3>
                        <p className="text-gray-500 text-sm mt-2 mb-8">Esto tomará unos segundos</p>

                        {/* ESPACIO PUBLICITARIO */}
                        <div className="w-full max-w-sm bg-pet-light/30 border-2 border-dashed border-pet-primary p-6 rounded-2xl text-center shadow-inner">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Espacio Patrocinado</span>
                            <p className="font-bold text-pet-dark mb-2">¿Tu mascota se escapa mucho?</p>
                            <p className="text-sm text-gray-600 mb-4">Consigue un collar GPS con 20% de descuento usando el código PETFINDER.</p>
                            <button className="bg-pet-accent text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                                Ver Oferta
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center bg-gray-50 mb-6 transition-all duration-300">
                    {previewUrl ? (
                        // 1. SI HAY FOTO: Mostramos el preview y el botón para cambiarla
                        <div className="flex flex-col items-center">
                            <img
                                src={previewUrl}
                                alt="Preview de la mascota"
                                className="max-h-60 w-auto rounded-lg shadow-md object-cover border-4 border-white"
                            />
                            <button
                                onClick={handleReset}
                                className="mt-4 px-5 py-2 bg-gray-200 hover:bg-gray-300 text-pet-dark font-bold rounded-xl transition-colors text-sm flex items-center gap-2 shadow-sm"
                            >
                                🔄 Cambiar foto
                            </button>
                        </div>
                    ) : (
                        // 2. SI NO HAY FOTO: Mostramos el Uploader
                        <>
                            <p className="text-gray-500 mb-2 font-medium">Haz clic o arrastra la foto aquí</p>
                            <ImageUploader onCropComplete={handleCropComplete} />
                        </>
                    )}
                </div>

                <div className={`transition-opacity duration-300 ${finalBlob ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>

                    <div className="flex gap-4 mb-6">
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-pet-dark focus:ring-2 focus:ring-pet-primary outline-none shadow-sm cursor-pointer"
                        >
                            <option value="dog">🐶 Perro</option>
                            <option value="cat">🐱 Gato</option>
                        </select>

                        <select
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-pet-dark focus:ring-2 focus:ring-pet-primary outline-none shadow-sm cursor-pointer"
                        >
                            <option value="black">⚫ Negro</option>
                            <option value="white">⚪ Blanco</option>
                            <option value="brown">🟤 Marrón / Canela</option>
                            <option value="golden">🟡 Dorado / Rubio</option>
                            <option value="mixed">🎨 Mixto / Manchado</option>
                        </select>
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-pet-dark mb-2">
                            📍 (Opcional) Marca en el mapa dónde se perdió
                        </label>
                        <MapSelector position={position} setPosition={setPosition} />
                        {position && (
                            <p className="text-xs text-green-600 mt-2 font-bold text-center">
                                ✅ Zona de búsqueda limitada
                            </p>
                        )}
                    </div>

                    <button
                        // Deshabilitamos el botón si no hay foto O si está cargando
                        disabled={!finalBlob || isAdLoading}
                        onClick={handleSearch}
                        className="w-full py-4 bg-pet-primary hover:bg-pet-primaryDark disabled:bg-gray-300 text-white font-bold rounded-xl transition-colors shadow-sm text-lg"
                    >
                        🔍 Buscar Coincidencias
                    </button>
                </div>

                {status && (
                    <div className="mt-6 text-center font-medium text-pet-dark bg-pet-light/50 p-4 rounded-xl border border-pet-light">
                        {status}
                    </div>
                )}

                {results.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-xl font-bold text-pet-dark mb-4 border-b pb-2">Resultados encontrados:</h3>
                        <div className="flex flex-col gap-4">
                            {results.map((pet) => (
                                <PetCard key={pet.id} pet={pet} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Search;