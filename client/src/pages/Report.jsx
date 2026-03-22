import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import MapSelector from '../components/MapSelector';
import AdBanner from '../components/AdBanner';
import { useSelector } from 'react-redux';

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
    const [isSuccess, setIsSuccess] = useState(false);
    const token = useSelector(state => state.user?.token);
    const [extraFiles, setExtraFiles] = useState([]); // Archivos reales
    const [extraPreviews, setExtraPreviews] = useState([]); // URLs para miniaturas

    const navigate = useNavigate();

    useEffect(() => {

        if (!token) navigate('/login');
    }, [navigate]);

    const handleCropComplete = (blob, url) => {
        setFinalBlob(blob);
        const imagePreviewUrl = url || URL.createObjectURL(blob);
        setPreviewUrl(imagePreviewUrl);
    };

    const handleExtraImages = (e) => {
        const files = Array.from(e.target.files);

        // Generamos las previas para la UI
        const newPreviews = files.map(file => URL.createObjectURL(file));

        setExtraFiles(prev => [...prev, ...files]);
        setExtraPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeExtraImage = (index) => {
        setExtraFiles(prev => prev.filter((_, i) => i !== index));
        setExtraPreviews(prev => {
            URL.revokeObjectURL(prev[index]); // Limpieza de memoria
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleReset = () => {
        setFinalBlob(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setStatus('');
    };

    const handleReport = async () => {
        if (!finalBlob || !contactInfo || !position) {
            setStatus('Faltan campos obligatorios: imagen, contacto y ubicación.');
            return;
        }

        setIsAdLoading(true);
        setStatus('');

        const formData = new FormData();
        formData.append('image', finalBlob);

        extraFiles.forEach((file) => {
            formData.append('extra_images', file);
        });

        formData.append('type', type);
        formData.append('color', color);
        formData.append('status', 'found');
        formData.append('contact_info', contactInfo);
        formData.append('description', description || 'Desconocido');
        formData.append('lat', position.lat);
        formData.append('lng', position.lng);




        setTimeout(async () => {
            try {
                const response = await fetch('http://localhost:3000/api/pets/report-pet', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {

                        navigate('/login');
                        throw new Error('Sesión expirada.');
                    }
                    throw new Error(data.error || 'Error al reportar');
                }

                setIsAdLoading(false);
                setIsSuccess(true);

                setTimeout(() => navigate('/profile'), 3500);

            } catch (error) {
                console.error(error);
                setStatus(error.message);
                setIsAdLoading(false);
            }
        }, 4000);
    };

    return (
        <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans text-gray-900 flex flex-col items-center">

            {/* Header sutil */}
            <div className="w-full max-w-2xl mb-8 flex justify-between items-center px-2">
                <Link to="/" className="text-sm font-medium text-pet-link hover:text-pet-accent transition-colors">
                    Volver al inicio
                </Link>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900">Reportar hallazgo.</h2>
            </div>

            <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] overflow-hidden p-8 md:p-12 relative min-h-[500px] border border-gray-100">

                {isSuccess ? (
                    <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-10 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-8">
                            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <h2 className="text-4xl font-semibold tracking-tighter text-black mb-4">Reporte enviado.</h2>
                        <p className="text-gray-400 font-medium mb-12 max-w-xs leading-relaxed">
                            Has aportado a que una mascota regrese con su familia. El reporte ya está activo en Nigra.
                        </p>
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest animate-pulse">
                            Redirigiendo a tu perfil
                        </span>
                    </div>

                ) : (
                    <>
                        {isAdLoading && (
                            <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-md">
                                <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin mb-6"></div>
                                <h3 className="text-xl font-semibold tracking-tight text-black text-center mb-10">
                                    Procesando vectores faciales...
                                </h3>
                                <AdBanner />
                            </div>
                        )}

                        <div className="mb-10 text-center">
                            <p className="text-gray-400 font-medium text-sm text-justify leading-relaxed max-w-sm mx-auto">
                                Sube una fotografía clara para que nuestro motor de IA pueda realizar el emparejamiento.
                                Recortala para que la cara de la mascota esté centrada y visible. Cuanta más información proporciones, mejores serán las posibilidades de reencuentro.
                            </p>
                        </div>

                        {/* Uploader Section */}
                        <div className="mb-10 flex flex-col items-center">
                            {previewUrl ? (
                                <div className="relative group">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="max-h-72 w-auto rounded-3xl shadow-sm object-cover border border-gray-100"
                                    />
                                    <button
                                        onClick={handleReset}
                                        className="mt-6 w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold rounded-2xl transition-all text-xs uppercase tracking-widest"
                                    >
                                        Cambiar fotografía
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full p-12 border-2 border-dashed border-gray-100 rounded-[32px] bg-gray-50/50 transition-all">
                                    <ImageUploader onCropComplete={handleCropComplete} />
                                </div>
                            )}
                        </div>

                        <div className={`mt-10 mb-3 space-y-4 transition-all ${finalBlob ? 'opacity-100' : 'opacity-20'}`}>
                            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">
                                Galería de confirmación (Opcional)
                            </label>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                {extraPreviews.map((url, index) => (
                                    <div key={index} className="relative aspect-square group">
                                        <img
                                            src={url}
                                            className="w-full h-full object-cover rounded-2xl border border-gray-100 shadow-sm"
                                            alt="Extra"
                                        />
                                        <button
                                            onClick={() => removeExtraImage(index)}
                                            className="absolute -top-2 -right-2 bg-white text-black w-6 h-6 rounded-full shadow-md flex items-center justify-center text-xs hover:bg-black hover:text-white transition-all"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}

                                {/* Botón para agregar más */}
                                <label className="aspect-square border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all text-gray-300 hover:text-gray-500">
                                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-[10px] font-bold uppercase">Añadir</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleExtraImages}
                                        disabled={!finalBlob}
                                    />
                                </label>
                            </div>
                            <p className="text-[10px] text-gray-300 font-medium italic">
                                Sube fotos de otros ángulos para ayudar al dueño a identificar a su mascota.
                            </p>
                        </div>

                        <div className={`space-y-8 transition-all duration-500 ${finalBlob ? 'opacity-100 translate-y-0' : 'opacity-20 pointer-events-none translate-y-4'}`}>

                            {/* Selectores */}
                            <div className="grid grid-cols-2 gap-4">
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
                                        {/* Flecha personalizada estilo Apple */}
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 group-focus-within:text-black transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Inputs de texto */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">Descripción</label>
                                    <input
                                        type="text"
                                        placeholder="Señas particulares o zona exacta"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="w-full px-5 py-4 bg-gray-50 text-gray-900 rounded-2xl border border-gray-100 focus:bg-white focus:ring-4 focus:ring-gray-100 outline-none transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">Contacto obligatorio</label>
                                    <input
                                        type="text"
                                        placeholder="Teléfono"
                                        value={contactInfo}
                                        onChange={e => setContactInfo(e.target.value)}
                                        className="w-full px-5 py-4 bg-gray-50 text-gray-900 rounded-2xl border border-gray-100 focus:bg-white focus:ring-4 focus:ring-gray-100 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Mapa */}
                            <div className="space-y-3">
                                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">Ubicación del hallazgo</label>
                                <div className="rounded-[32px] overflow-hidden border border-gray-100 shadow-inner">
                                    <MapSelector position={position} setPosition={setPosition} />
                                </div>
                                {position && (
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest text-center mt-2">
                                        Coordenadas capturadas
                                    </p>
                                )}
                            </div>

                            <button
                                disabled={!finalBlob || !contactInfo || !position || isAdLoading}
                                onClick={handleReport}
                                className="w-full py-5 bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold rounded-full transition-all duration-300 shadow-sm text-lg mt-8"
                            >
                                Publicar reporte
                            </button>
                        </div>

                        {status && (
                            <div className="mt-8 text-center text-xs font-semibold text-red-400 uppercase tracking-widest animate-fade-in">
                                {status}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="mt-12 text-[10px] text-gray-300 font-bold tracking-[0.2em] uppercase">
                Sistema de Reportes Nigra
            </div>
        </div>
    );
}

export default Report;