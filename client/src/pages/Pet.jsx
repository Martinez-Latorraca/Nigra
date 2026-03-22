import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { openChat } from '../store/chatSlice';


function Pet() {
    const { id } = useParams();
    const token = useSelector(state => state.user?.token);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Estados para la carga de datos
    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estado para la galería a pantalla completa
    const [selectedImage, setSelectedImage] = useState(null);

    // Obtenemos usuario actual para verificar si es el dueño
    const currentUser = useSelector(state => state.user?.data);

    const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
    });

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
                // Hacemos el fetch al backend (ajustá la URL si es necesario)
                const response = await fetch(`http://localhost:3000/api/pets/${id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) throw new Error('Mascota no encontrada.');
                    throw new Error('Error al conectar con el servidor.');
                }

                const data = await response.json();
                setPet(data);

            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPet();
    }, [id]);

    // Función para abrir la conversación (usando el evento que creamos antes)
    const handleOpenChat = () => {
        dispatch(openChat({
            pet_id: pet.id,
            petPhoto: pet.photo_url,
            otherUserId: pet.user_id,
            otherUserName: pet.reporter_name
        }));
    };

    // --- RENDERIZADO DE ESTADOS DE CARGA Y ERROR ---
    if (loading) return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-sans text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin mr-4"></div>
            Sincronizando Nigra ID
        </div>
    );

    if (error || !pet) return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center font-sans p-6 text-center">
            <h1 className="text-6xl font-semibold text-black mb-4">404.</h1>
            <p className="text-gray-500 mb-10 max-w-xs">{error || 'No pudimos encontrar esta mascota.'}</p>
            <Link to="/" className="px-8 py-3 bg-black text-white rounded-full font-semibold">Volver al inicio</Link>
        </div>
    );



    return (
        <div className="min-h-screen bg-[#F5F5F7] p-6 pb-20 font-sans text-gray-900 flex flex-col items-center relative">

            {/* --- MODAL PANTALLA COMPLETA --- */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center animate-fade-in p-4 backdrop-blur-sm cursor-zoom-out"
                    onClick={() => setSelectedImage(null)} // Cierra al hacer clic en el fondo
                >
                    <button className="absolute top-6 right-8 text-white/50 hover:text-white transition-colors text-2xl font-light">✕</button>
                    <img
                        src={selectedImage}
                        alt="Mascota Fullscreen"
                        className="max-w-full max-h-full object-contain rounded-3xl animate-slide-up"
                    />
                </div>
            )}

            {/* Header de navegación */}
            <div className="w-full max-w-6xl mb-12 flex justify-between items-center px-2">
                <button onClick={() => navigate(-1)} className="text-sm font-medium text-pet-link hover:text-pet-accent transition-colors flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Volver
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Nigra ID</span>

                </div>
            </div>

            {/* --- CUERPO PRINCIPAL --- */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16 items-start">

                {/* COLUMNA IZQUIERDA: GALERÍA */}
                <div className="md:col-span-6 space-y-6">
                    {/* Foto Principal */}
                    <div
                        className="bg-white rounded-[40px] p-4 shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-gray-100 cursor-zoom-in"
                        onClick={() => setSelectedImage(pet.photo_url)}
                    >
                        <img
                            src={pet.photo_url}
                            alt="Mascota"
                            className="w-full h-auto aspect-[4/3] object-cover rounded-[32px] transition-transform duration-500 hover:scale-[1.01]"
                        />
                    </div>

                    {/* Fotos Extras (solo si existen) */}
                    {pet.extra_photos && pet.extra_photos.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 px-2">
                            {pet.extra_photos.map((url, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-3xl p-2 shadow-[0_10px_25px_rgba(0,0,0,0.02)] border border-gray-100 cursor-zoom-in group"
                                    onClick={() => setSelectedImage(url)}
                                >
                                    <img
                                        src={url}
                                        alt={`Extra ${index}`}
                                        className="w-full h-auto aspect-square object-cover rounded-2xl transition-opacity group-hover:opacity-90"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* COLUMNA DERECHA: INFORMACIÓN */}
                <div className="md:col-span-6 space-y-8 ">
                    {/* Encabezado y Estado */}
                    <div className="flex flex-col md:flex-row justify-between items-top  space-y-3">
                        <div className='mt-4'>
                            <span className={`inline-block text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest ${pet.status === 'lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                {pet.status === 'lost' ? 'Buscando' : 'Registrado (Hallado)'}
                            </span>
                        </div>
                        <div className='flex flex-col text-end gap-4' >

                            <p className="text-gray-400 font-medium tracking-tight text-xl">
                                Especie:  {pet.type === 'dog' ? 'Perro' : 'Gato'}
                            </p>
                            <p className="text-gray-400 font-medium tracking-tight text-xl">
                                Color: {pet.color === 'black' ? 'Negro' : pet.color}
                            </p>
                        </div>
                    </div>

                    {/* Caja de Descripción Completa */}
                    <div className="bg-white rounded-[40px] p-8 md:p-10 shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-gray-100 space-y-4">
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Información detallada</span>
                        <p className="text-gray-700 text-base leading-relaxed font-medium">
                            {pet.description || "Sin descripción adicional."}
                        </p>
                    </div>

                    {/* Sección de Acción / Mapa sutil */}
                    <div className="border-t border-gray-100 pt-8 space-y-6">
                        <div className="flex items-center gap-4 text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="text-sm font-medium">Donde lo encontraron </span>
                        </div>
                        <div className="h-64 w-full rounded-[40px] overflow-hidden border border-gray-100 shadow-inner z-0">
                            {pet.lat && pet.lng ? (
                                <MapContainer center={[pet.lat, pet.lng]} zoom={12} scrollWheelZoom={false} className="h-full w-full">
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                    <Marker position={[pet.lat, pet.lng]} icon={icon} />
                                    <RecenterMap lat={pet.lat} lng={pet.lng} />
                                </MapContainer>
                            ) : (
                                <div className="h-full w-full bg-gray-50 flex items-center justify-center text-gray-300 text-xs font-bold uppercase tracking-widest">
                                    Ubicación no disponible
                                </div>
                            )}
                        </div>

                        {/* Botón de Acción (solo mostrar si no soy el dueño) */}
                        {currentUser?.id !== pet.user_id && (
                            <button
                                key={id}
                                onClick={handleOpenChat}

                                className="w-full py-5 bg-black hover:bg-gray-800 text-white font-semibold rounded-full transition-all duration-300 shadow-sm text-lg flex items-center justify-center gap-3"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                {pet.status === 'lost' ? 'Enviar información' : 'Contactar al rescatista'}
                            </button>
                        )}

                        <p className="text-[11px] text-gray-300 font-medium italic text-center px-4">
                            Toda comunicación es anónima y segura a través de la Red Nigra.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Pet;