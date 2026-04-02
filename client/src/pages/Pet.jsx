import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { openChat } from '../store/chatSlice';
import { translateColor, translateType } from '../utils/translations';



function Pet() {
    const { id } = useParams();
    const token = useSelector(state => state.user?.token);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);

    const currentUser = useSelector(state => state.user?.data);


    function RecenterMap({ lat, lng }) {
        const map = useMap();
        useEffect(() => {
            if (lat && lng) map.setView([lat, lng], 15);
        }, [lat, lng, map]);
        return null;
    }




    useEffect(() => {
        const fetchPet = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/${id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) throw new Error('Mascota no encontrada.');
                const data = await response.json();
                setPet(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPet();
    }, [id, token]);

    const handleOpenChat = () => {
        if (!token) {
            navigate('/login');
        } else {
            dispatch(openChat({
                pet_id: pet.id,
                petPhoto: pet.photo_url,
                otherUserId: pet.user_id,
                otherUserName: pet.reporter_name
            }));
        }
    };
    const handleCallClick = (e) => {
        if (!token) {
            e.preventDefault();
            alert('Inicia sesión en Nigra para acceder a los datos de contacto.');
            navigate('/login');
            return;
        }
    };


    const handleShare = async () => {
        const shareData = {
            title: pet.status === 'lost' ? `🔍 ¡Ayudanos a encontrar a ${pet.name || 'una mascota'}!` : `🐾 ¡${pet.name || 'Una mascota'} fue encontrado/a!`,
            text: pet.status === 'lost' ? 'Compartí para ayudar a que vuelva a casa.' : '¿Lo reconocés? Ayudanos a difundir.',
            url: `${import.meta.env.VITE_API_URL}/pet/${pet.id}`,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log("Error al compartir:", err);
            }
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-sans text-gray-400">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Sincronizando Nigra ID</div>
        </div>
    );

    if (error || !pet) return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans p-6 text-center">
            <h1 className="text-6xl font-semibold text-black mb-4">404.</h1>
            <p className="text-gray-500 mb-10">{error || 'No pudimos encontrar esta mascota.'}</p>
            <Link to="/" className="px-8 py-3 bg-black text-white rounded-full font-semibold">Volver al inicio</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F5F5F7] p-6 pb-20 font-sans text-gray-900 flex flex-col items-center">

            {/* --- MODAL PANTALLA COMPLETA --- */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out" onClick={() => setSelectedImage(null)}>
                    <img src={selectedImage} alt="Mascota Full" className="max-w-full max-h-full object-contain rounded-3xl animate-slide-up" />
                </div>
            )}

            {/* Header de navegación */}
            <div className="w-full max-w-6xl mb-12 flex justify-between items-center">
                <button onClick={() => navigate(-1)} className="text-[10px] font-bold text-gray-400 hover:text-black transition-colors flex items-center gap-2 uppercase tracking-widest">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6" /></svg>
                    Volver
                </button>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">Registro Oficial</span>
            </div>

            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16">

                {/* COLUMNA IZQUIERDA: GALERÍA (Sin cambios) */}
                <div className="md:col-span-6 space-y-6">
                    <div className="bg-white rounded-[40px] p-4 shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-gray-100 cursor-zoom-in" onClick={() => setSelectedImage(pet.photo_url)}>
                        <img src={pet.photo_url} alt="Mascota" className="w-full aspect-[4/3] object-cover rounded-[32px]" />
                    </div>
                    {pet.extra_photos?.length > 0 && (
                        <div className="grid grid-cols-4 gap-4 px-2">
                            {pet.extra_photos.map((url, i) => (
                                <div key={i} className="bg-white rounded-3xl p-2 border border-gray-100 cursor-zoom-in shadow-sm" onClick={() => setSelectedImage(url)}>
                                    <img src={url} alt={`Extra ${i}`} className="w-full aspect-square object-cover rounded-2xl" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* COLUMNA DERECHA: INFORMACIÓN ADAPTADA A CARDS */}
                <div className="md:col-span-6 space-y-8">

                    <div className="space-y-6">
                        {/* 1. Badge de Estado y Metadatos Superiores (Igual que en Card) */}
                        <div className="flex justify-between items-center">
                            <span className={`text-[9px] font-bold px-4 py-2 rounded-full uppercase tracking-widest shadow-sm ${pet.status === 'lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                {pet.status === 'lost' ? 'Perdido' : 'Encontrado'}
                            </span>
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                Nigra ID #{pet.id}
                            </span>
                        </div>

                        {/* 2. Título y Especie (Igual que en Card) */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-pet-accent uppercase tracking-[0.2em]">
                                    {translateType(pet.type)} • {translateColor(pet.color)}
                                </span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter text-black leading-none">
                                {pet.name || "Encontrado"}.
                            </h2>
                        </div>

                        {/* 3. Información del Informante */}
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]  block">Informante: </span>
                            <p className="text-sm font-semibold text-gray-900">{pet.reporter_name || 'Usuario Anónimo'}</p>
                        </div>


                        {/* 4. Descripción Larga */}
                        <div className=" border-t border-gray-100">
                            <p className="text-gray-600 text-base leading-relaxed font-medium">
                                Informacion adicional: {pet.description || "Sin detalles adicionales proporcionados."}
                            </p>
                        </div>
                    </div>

                    {/* SECCIÓN MAPA Y BOTONES (Sin cambios en lógica, ajuste visual) */}
                    <div className="space-y-6">
                        <div className="h-64 rounded-[40px] overflow-hidden border border-gray-100 shadow-inner">

                            {pet.lat && (
                                <div className="h-full rounded-[24px] overflow-hidden border border-gray-50 grayscale group-hover:grayscale-0 transition-all">
                                    <MapContainer center={[pet.lat, pet.lng]} zoom={17} zoomControl={false} scrollWheelZoom={false} dragging={false} className="w-full h-full z-0">
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                        <Marker position={[pet.lat, pet.lng]} />
                                    </MapContainer>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-4">

                            {currentUser?.id !== pet.user_id && (


                                <button
                                    onClick={handleOpenChat}
                                    className="w-full py-5 border-2 border-transparent bg-black hover:bg-gray-800 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    {pet.status === 'lost' ? 'Enviar información' : 'Contactar al rescatista'}
                                </button>

                            )}
                            {currentUser?.id !== pet.user_id && (
                                <a
                                    href={`tel:${pet.contact_info}`}
                                    onClick={handleCallClick}
                                    className="w-full py-5 border-2 border-transparent bg-gray-300 hover:bg-gray-400 text-gray-800 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                    Llamar
                                </a>

                            )}
                            <button
                                onClick={handleShare}
                                className="w-full py-5 border-2 border-gray-100 bg-white hover:border-black text-gray-400 hover:text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-full transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                    <polyline points="16 6 12 2 8 6" />
                                    <line x1="12" y1="2" x2="12" y2="15" />
                                </svg>
                                Compartir
                            </button>

                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                                Sistema de Mensajería Encriptado Red Nigra
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

export default Pet;