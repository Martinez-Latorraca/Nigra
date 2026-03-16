import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import PetCard from '../components/PetCard';
import MapSelector from '../components/MapSelector';

function Report() {
    const [finalBlob, setFinalBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [type, setType] = useState('dog');
    const [color, setColor] = useState('black');

    const [description, setDescription] = useState('');
    const [contactInfo, setContactInfo] = useState('');

    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [position, setPosition] = useState(null);

    // 1. NUEVO ESTADO: Controla la pantalla de carga con publicidad
    const [isAdLoading, setIsAdLoading] = useState(false);

    const navigate = useNavigate();

    // EL GUARDIA: Si no hay token en el navegador, lo mandamos al Login
    useEffect(() => {
        const token = localStorage.getItem('petFinderToken');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

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
        setStatus('');
    };

    const handleReport = async () => {
        // 1. AHORA TAMBIÉN EXIGIMOS LA POSICIÓN DEL MAPA
        if (!finalBlob || !contactInfo || !position) {
            setStatus('⚠️ La foto, el contacto y la ubicación en el mapa son obligatorios.');
            return;
        }

        // 2. Encendemos los estados de carga y limpiamos mensajes anteriores
        setLoading(true);
        setIsAdLoading(true);
        setStatus('');

        const formData = new FormData();
        formData.append('image', finalBlob);
        formData.append('type', type);
        formData.append('color', color);
        formData.append('status', 'found'); // Forzamos el estado a "encontrado"
        formData.append('contact_info', contactInfo);

        // El backend viejo pedía "name", así que le mandamos la descripción ahí para no romper nada
        formData.append('description', description || 'Desconocido');

        // 3. ¡AQUÍ ESTÁ LA MAGIA QUE FALTABA! Mandamos las coordenadas
        formData.append('lat', position.lat);
        formData.append('lng', position.lng);

        // 4. Temporizador de 4 segundos envolviendo tu lógica original
        setTimeout(async () => {
            try {
                // Recuperamos la llave de la bóveda
                const token = localStorage.getItem('petFinderToken');

                // Hacemos la petición con la llave en la mano
                const response = await fetch('http://localhost:3000/api/pets/report-pet', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        localStorage.removeItem('petFinderToken');
                        navigate('/login');
                        throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
                    }
                    throw new Error(data.error || 'Error al reportar');
                }

                setStatus('✅ ¡Mascota reportada con éxito! Ya está en la base de datos.');

                // Limpiar el formulario después de un éxito
                setTimeout(() => {
                    handleReset();
                    setDescription('');
                    setContactInfo('');
                    // También limpiamos el mapa
                    setPosition(null);
                }, 3000);

            } catch (error) {
                console.error(error);
                setStatus(`❌ ${error.message}`);
            } finally {
                setLoading(false);
                setIsAdLoading(false);
            }
        }, 4000);
    };


    return (
        <div className="min-h-screen bg-pet-light p-4 font-sans text-pet-dark flex flex-col items-center">

            <div className="w-full max-w-xl mb-4 flex justify-between items-center">
                <Link to="/" className="text-pet-primary hover:text-pet-primaryDark font-bold flex items-center gap-2 transition-colors">
                    <span>←</span> Volver al inicio
                </Link>
                <h2 className="text-xl font-extrabold text-pet-accent">🤝 Reportar Mascota</h2>
            </div>

            {/* Agregamos 'relative' para que la capa de carga no se escape de la tarjeta */}
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 border-t-8 border-pet-accent relative">

                {/* --- CAPA SUPERPUESTA DE CARGA Y PUBLICIDAD --- */}
                {isAdLoading && (
                    <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pet-accent mb-4"></div>
                        <h3 className="text-xl font-bold text-pet-primaryDark animate-pulse text-center">
                            Procesando vectores y subiendo reporte...
                        </h3>
                        <p className="text-gray-500 text-sm mt-2 mb-8">Esto tomará unos segundos</p>

                        {/* ESPACIO PUBLICITARIO */}
                        <div className="w-full max-w-sm bg-pet-light/30 border-2 border-dashed border-pet-accent p-6 rounded-2xl text-center shadow-inner">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Espacio Patrocinado</span>
                            <p className="font-bold text-pet-dark mb-2">Protege a tu mascota hoy</p>
                            <p className="text-sm text-gray-600 mb-4">Consigue una placa identificatoria inteligente con envío gratis a todo Montevideo. Usa el código PETFINDER20.</p>
                            <button className="bg-pet-accent text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                                Ver Tienda
                            </button>
                        </div>
                    </div>
                )}
                {/* ---------------------------------------------- */}

                <p className="text-gray-600 mb-6 text-center">
                    Ayuda a esta mascota a volver a casa. Sube una foto clara de su cara.
                </p>

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

                    <div className="flex gap-4 mb-4">
                        <select
                            value={type} onChange={(e) => setType(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-pet-dark focus:ring-2 focus:ring-pet-accent outline-none shadow-sm cursor-pointer"
                        >
                            <option value="dog">🐶 Perro</option>
                            <option value="cat">🐱 Gato</option>
                        </select>

                        <select
                            value={color} onChange={(e) => setColor(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-pet-dark focus:ring-2 focus:ring-pet-accent outline-none shadow-sm cursor-pointer"
                        >
                            <option value="black">⚫ Negro</option>
                            <option value="white">⚪ Blanco</option>
                            <option value="brown">🟤 Marrón / Canela</option>
                            <option value="golden">🟡 Dorado / Rubio</option>
                            <option value="mixed">🎨 Mixto / Manchado</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Zona donde lo encontraste o descripción breve"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-white text-pet-dark placeholder-gray-400 rounded-xl border border-gray-300 focus:ring-2 focus:ring-pet-accent outline-none transition-all shadow-sm"
                        />
                    </div>

                    <div className="mb-6">
                        <input
                            type="text"
                            placeholder="Tu teléfono o email de contacto *"
                            value={contactInfo}
                            onChange={e => setContactInfo(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-white text-pet-dark placeholder-gray-400 rounded-xl border border-gray-300 focus:ring-2 focus:ring-pet-accent outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-pet-dark mb-2">
                            📍 Toca el mapa para marcar dónde lo encontraste *
                        </label>

                        {/* AQUÍ USAMOS TU NUEVO COMPONENTE */}
                        <MapSelector position={position} setPosition={setPosition} />

                        {position && (
                            <p className="text-xs text-green-600 mt-2 font-bold text-center">
                                ✅ Ubicación capturada
                            </p>
                        )}
                    </div>

                    <button
                        // El botón se bloquea si falta información o si está en estado de carga
                        disabled={!finalBlob || loading || !contactInfo || isAdLoading}
                        onClick={handleReport}
                        className="w-full py-4 bg-pet-accent hover:opacity-90 disabled:bg-gray-300 text-white font-bold rounded-xl transition-all shadow-sm text-lg"
                    >
                        {loading ? 'Subiendo...' : '🚨 Reportar Mascota Encontrada'}
                    </button>
                </div>

                {status && (
                    <div className={`mt-6 text-center font-medium p-4 rounded-xl border ${status.includes('❌') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-pet-light/50 text-pet-dark border-pet-light'}`}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Report;