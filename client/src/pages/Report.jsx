import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import MapSelector from '../components/MapSelector';
import AdBanner from '../components/AdBanner';

function Report() {
    const [finalBlob, setFinalBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [type, setType] = useState('dog');
    const [color, setColor] = useState('black');

    const [description, setDescription] = useState('');
    const [contactInfo, setContactInfo] = useState('');

    const [status, setStatus] = useState('');
    const [position, setPosition] = useState(null);

    const [isAdLoading, setIsAdLoading] = useState(false);

    // 1. NUEVO: Estado para controlar si mostramos la tarjeta de éxito
    const [isSuccess, setIsSuccess] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('petFinderToken');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    const handleCropComplete = (blob, url) => {
        setFinalBlob(blob);
        const imagePreviewUrl = url || URL.createObjectURL(blob);
        setPreviewUrl(imagePreviewUrl);
    };

    const handleReset = () => {
        setFinalBlob(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setStatus('');
    };

    const handleReport = async () => {
        if (!finalBlob || !contactInfo || !position) {
            setStatus('⚠️ La foto, el contacto y la ubicación en el mapa son obligatorios.');
            return;
        }

        setIsAdLoading(true);
        setStatus('');

        const formData = new FormData();
        formData.append('image', finalBlob);
        formData.append('type', type);
        formData.append('color', color);
        formData.append('status', 'found');
        formData.append('contact_info', contactInfo);
        formData.append('description', description || 'Desconocido');
        formData.append('lat', position.lat);
        formData.append('lng', position.lng);

        setTimeout(async () => {
            try {
                const token = localStorage.getItem('petFinderToken');

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

                // 2. ÉXITO TOTAL: Apagamos cargas, encendemos tarjeta de victoria
                setIsAdLoading(false);
                setIsSuccess(true);

                // 3. Temporizador: Lo mandamos al perfil después de 3.5 segundos
                setTimeout(() => {
                    navigate('/profile');
                }, 3500);

            } catch (error) {
                console.error(error);
                setStatus(`❌ ${error.message}`);
                setIsAdLoading(false); // Solo apagamos el loader si hay error, para que corrija
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

            <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 border-t-8 border-pet-accent relative min-h-[400px]">

                {/* --- RENDERIZADO CONDICIONAL --- */}
                {isSuccess ? (
                    // 4. NUEVO: TARJETA DE AGRADECIMIENTO (Ocupa todo el espacio)
                    <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <span className="text-5xl">💚</span>
                        </div>
                        <h2 className="text-3xl font-extrabold text-pet-dark mb-4">¡Gracias por tu ayuda!</h2>
                        <p className="text-gray-600 mb-8 text-lg">
                            Has aportado un granito de arena para reunir a una familia. Tu reporte ya está activo.
                        </p>

                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-pet-accent"></div>
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Redirigiendo a tu perfil...</span>
                        </div>
                    </div>

                ) : (
                    // 5. EL FORMULARIO NORMAL (Se oculta cuando isSuccess es true)
                    <>
                        {/* Capa de Carga y Publicidad */}
                        {isAdLoading && (
                            <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
                                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pet-accent mb-4"></div>
                                <h3 className="text-xl font-bold text-pet-primaryDark animate-pulse text-center">
                                    Procesando vectores y subiendo reporte...
                                </h3>
                                <p className="text-gray-500 text-sm mt-2 mb-8">Esto tomará unos segundos</p>

                                <AdBanner
                                    title="Protege a tu mascota hoy"
                                    description="Consigue una placa identificatoria inteligente con envío gratis a todo Montevideo. Usa el código PETFINDER20."
                                    buttonText="Ver Tienda"
                                    link="https://www.mercadolibre.com.uy/"
                                />
                            </div>
                        )}

                        <p className="text-gray-600 mb-6 text-center">
                            Ayuda a esta mascota a volver a casa. Sube una foto clara de su cara.
                        </p>

                        <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center bg-gray-50 mb-6 transition-all duration-300">
                            {previewUrl ? (
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

                                <MapSelector position={position} setPosition={setPosition} />

                                {position ? (
                                    <p className="text-xs text-green-600 mt-2 font-bold text-center">
                                        ✅ Ubicación capturada
                                    </p>
                                ) : (
                                    <p className="text-xs text-pet-accent mt-2 font-bold text-center">
                                        ⚠️ Selecciona una ubicación para continuar
                                    </p>
                                )}
                            </div>

                            <button
                                disabled={!finalBlob || !contactInfo || !position || isAdLoading}
                                onClick={handleReport}
                                className="w-full py-4 bg-pet-accent hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-sm text-lg"
                            >
                                {(!finalBlob || !contactInfo || !position) ? '⚠️ Faltan datos obligatorios' : '🚨 Reportar Mascota Encontrada'}
                            </button>
                        </div>

                        {status && (
                            <div className={`mt-6 text-center font-medium p-4 rounded-xl border ${status.includes('❌') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-pet-light/50 text-pet-dark border-pet-light'}`}>
                                {status}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default Report;