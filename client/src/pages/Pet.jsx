import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
    ChevronLeft, ChevronRight, Map as MapIcon, Maximize2, User, Calendar, Stethoscope, Star,
    MapPin, ExternalLink, MessageCircle, Share2, ShieldCheck, HeartHandshake, Trash2, Dog, Cat,
} from 'lucide-react';
import { openChat } from '../store/chatSlice';
import { translateColor, translateType } from '../utils/translations';
import { CARTO_LIGHT_TILES } from '../utils/links';
import { C, STATUS, petStatusKey } from '../utils/theme';
import { petShareMessage } from '../utils/shareText';

const API = import.meta.env.VITE_API_URL;
const SITE_URL = 'https://mimo.uy';

// Pin de marca para el mapa (handoff: estilo de mapa actual, pin de Mimo).
const PIN_ICON = L.icon({ iconUrl: '/landing/pin.svg', iconSize: [36, 44], iconAnchor: [18, 44] });

const extraPhotos = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
        try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch { return []; }
    }
    return [];
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function Pet() {
    const { id } = useParams();
    const token = useSelector(state => state.user?.token);
    const currentUser = useSelector(state => state.user?.data);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [pet, setPet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [photoIdx, setPhotoIdx] = useState(0);
    const [viewer, setViewer] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchPet = async () => {
            try {
                const response = await fetch(`${API}/api/pets/${id}`, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                });
                if (!response.ok) throw new Error('No pudimos encontrar esta mascota.');
                setPet(await response.json());
            } catch (err) {
                setError(err.message === 'Failed to fetch' ? 'No pudimos conectarnos. Probá de nuevo en un rato.' : err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPet();
    }, [id, token]);

    // Título de la pestaña. Las meta tags para compartir las pone el servidor.
    useEffect(() => {
        if (!pet) return;
        const who = pet.status === 'lost' ? pet.name || capitalize(translateType(pet.type)) || 'Mascota' : `${capitalize(translateType(pet.type)) || 'Mascota'} encontrado`;
        document.title = `${who} · Mimo`;
        return () => { document.title = 'Mimo - Comunidad de Reencuentro Animal'; };
    }, [pet]);

    if (loading) return <PetSkeleton />;

    if (error || !pet) return (
        <div className="flex-1 bg-mimo-warm flex flex-col items-center justify-center font-sans p-6 text-center text-mimo-noche">
            <p className="font-display font-black text-7xl m-0">404</p>
            <p className="mt-3 mb-8 text-base">{error || 'No pudimos encontrar esta mascota.'}</p>
            <Link to="/pets" className="h-12 px-6 rounded-[18px] bg-mimo-noche text-mimo-warm font-bold flex items-center">
                Ver mascotas reportadas
            </Link>
        </div>
    );

    const isLost = pet.status === 'lost';
    const isOwn = currentUser?.id != null && Number(currentUser.id) === Number(pet.user_id);
    const isResolved = !!pet.resolved_at;
    const status = STATUS[petStatusKey(pet)];
    const photos = [pet.photo_url, ...extraPhotos(pet.extra_photos)].filter(Boolean);
    const mainPhoto = photos[photoIdx] || pet.photo_url;
    const meta = [translateType(pet.type), translateColor(pet.color)].filter(Boolean).join(' · ');
    const title = isLost ? pet.name || 'Sin nombre' : 'Encontrado';
    const description = pet.description && pet.description !== 'Desconocido' ? pet.description : 'Sin detalles adicionales.';
    const SpeciesIcon = pet.type === 'cat' ? Cat : Dog;

    const handleOpenChat = () => {
        if (!token) return navigate('/login');
        dispatch(openChat({
            pet_id: pet.id,
            petPhoto: pet.photo_url,
            otherUserId: pet.user_id,
            otherUserName: pet.reporter_name,
        }));
    };

    // El caso se cierra desde el chat (igual que en la app). Desde la ficha el
    // dueño solo puede reabrir un caso cerrado.
    const handleReopen = async () => {
        if (!window.confirm('¿Reabrir el reporte? Vuelve a aparecer en las búsquedas y en el feed.')) return;
        try {
            const res = await fetch(`${API}/api/pets/${pet.id}/resolve`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ resolved: false }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setPet((prev) => ({ ...prev, resolved_at: data.resolved_at }));
        } catch {
            alert('No se pudo actualizar el estado. Probá de nuevo.');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Eliminar esta publicación? Se borra de forma permanente, con sus fotos. No se puede deshacer.')) return;
        try {
            const res = await fetch(`${API}/api/pets/${pet.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
            navigate('/profile');
        } catch {
            alert('No se pudo eliminar la publicación. Probá de nuevo.');
        }
    };

    // En el celular abre el menú de compartir; en la compu copia el texto.
    const handleShare = async () => {
        const text = petShareMessage(pet, SITE_URL);
        if (navigator.share) {
            try { await navigator.share({ text }); } catch { /* cancelado */ }
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            window.prompt('Copiá el texto para compartir:', text);
        }
    };

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${pet.lat},${pet.lng}`;

    return (
        <div className="flex-1 bg-mimo-warm font-sans text-mimo-noche">
            {viewer && (
                <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setViewer(null)}>
                    <img src={viewer} alt={`${title} - vista completa`} className="max-w-full max-h-full object-contain rounded-3xl" />
                </div>
            )}

            <main className="w-full max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-7 pb-20 flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/pets'))}
                        className="flex items-center gap-1.5 h-10 pl-2 pr-3.5 rounded-full bg-white text-sm font-bold"
                    >
                        <ChevronLeft size={18} strokeWidth={2} />
                        Volver
                    </button>
                    <span className="flex items-center gap-1.5 text-[13px] font-bold min-w-0">
                        <MapIcon size={16} strokeWidth={2} className="shrink-0" />
                        <Link to="/pets" className="hover:text-mimo-coral">Explorar</Link>
                        <span className="opacity-50">/</span>
                        <span className="truncate">{title}</span>
                    </span>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
                    {/* Fotos */}
                    <div className="w-full lg:flex-[0_0_620px] flex flex-col gap-3.5">
                        <div className="relative h-[340px] sm:h-[460px] lg:h-[520px] rounded-[32px] bg-mimo-muted overflow-hidden flex items-center justify-center">
                            {mainPhoto ? (
                                <img src={mainPhoto} alt={title} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <SpeciesIcon size={96} strokeWidth={1.5} color={C.noche} opacity={0.35} />
                            )}
                            <span className="absolute top-[18px] left-[18px] h-8 px-3 rounded-full bg-mimo-noche/55 text-mimo-warm text-[13px] font-bold flex items-center">
                                Mimo ID #{pet.id}
                            </span>
                            {mainPhoto && (
                                <button
                                    aria-label="Ver en pantalla completa"
                                    onClick={() => setViewer(mainPhoto)}
                                    className="absolute right-[18px] bottom-[18px] w-11 h-11 rounded-full bg-mimo-noche/55 flex items-center justify-center"
                                >
                                    <Maximize2 size={20} strokeWidth={2} color={C.crema} />
                                </button>
                            )}
                        </div>
                        {photos.length > 1 && (
                            <div className="flex gap-3 flex-wrap">
                                {photos.map((url, i) => (
                                    <button
                                        key={`${url}-${i}`}
                                        aria-label={`Foto ${i + 1}`}
                                        onClick={() => setPhotoIdx(i)}
                                        className="w-24 h-24 rounded-[20px] bg-mimo-muted overflow-hidden box-border"
                                        style={i === photoIdx ? { border: `3px solid ${status.color}` } : undefined}
                                    >
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Datos */}
                    <div className="w-full flex-1 min-w-0 flex flex-col gap-[22px]">
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-3">
                                <span className="px-3.5 py-[5px] rounded-full text-mimo-muted text-[13px] font-bold" style={{ background: status.color }}>
                                    {status.label}
                                </span>
                                {meta && <span className="text-[13px] font-bold tracking-[.08em] uppercase">{meta}</span>}
                            </div>
                            <h1 className="mt-1 mb-0 font-display font-black text-4xl md:text-5xl leading-[1.05] break-words">{title}</h1>
                            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
                                <span className="flex items-center gap-1.5">
                                    <User size={16} strokeWidth={2} />
                                    Informante: <b>{pet.reporter_name || 'Anónimo'}</b>
                                </span>
                                {pet.created_at && (
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={16} strokeWidth={2} />
                                        {new Date(pet.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {pet.vet_name && (
                            <Link
                                to={pet.vet_slug ? `/vets/${pet.vet_slug}` : '/vets'}
                                className="self-start px-3.5 py-2 rounded-full bg-white border border-mimo-muted flex items-center gap-2 text-sm font-bold hover:border-mimo-noche transition-colors"
                            >
                                <Stethoscope size={16} strokeWidth={2} />
                                Reportado por {pet.vet_name}
                                {pet.vet_verified_at && <Star size={14} strokeWidth={2} color={C.sol} fill={C.sol} />}
                                <ChevronRight size={16} strokeWidth={2} />
                            </Link>
                        )}

                        <section className="bg-white rounded-3xl p-5 flex flex-col gap-2">
                            <p className="m-0 text-xs font-bold tracking-[.08em] uppercase">Descripción</p>
                            <p className="m-0 text-base leading-[1.55] whitespace-pre-line break-words">{description}</p>
                        </section>

                        {(pet.address || (pet.lat && pet.lng)) && (
                            <section className="flex flex-col gap-2.5">
                                {pet.address && (
                                    <p className="m-0 flex items-start gap-1.5 text-[15px]">
                                        <MapPin size={16} strokeWidth={2} className="shrink-0 mt-[3px]" />
                                        <span>{isLost ? 'Perdido' : 'Encontrado'} cerca de <b>{pet.address}</b></span>
                                    </p>
                                )}
                                {pet.lat && pet.lng && (
                                    <div className="relative h-[220px] rounded-3xl overflow-hidden bg-mimo-muted">
                                        <MapContainer
                                            center={[pet.lat, pet.lng]}
                                            zoom={16}
                                            zoomControl={false}
                                            scrollWheelZoom={false}
                                            dragging={false}
                                            doubleClickZoom={false}
                                            attributionControl={false}
                                            className="w-full h-full z-0"
                                        >
                                            <TileLayer url={CARTO_LIGHT_TILES} />
                                            <Marker position={[pet.lat, pet.lng]} icon={PIN_ICON} />
                                        </MapContainer>
                                        <a
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute right-3.5 bottom-3.5 z-[400] flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-[13px] font-bold hover:text-mimo-coral"
                                        >
                                            <ExternalLink size={14} strokeWidth={2} />
                                            Abrir en Maps
                                        </a>
                                    </div>
                                )}
                            </section>
                        )}

                        <div className="flex flex-col gap-2.5">
                            {isResolved && (
                                <div className="flex items-center gap-4 rounded-3xl px-5 py-4 text-mimo-muted" style={{ background: C.violeta }}>
                                    <HeartHandshake size={30} strokeWidth={2} className="shrink-0" />
                                    <div>
                                        <p className="m-0 font-display font-black text-xl">¡Volvió a casa!</p>
                                        <p className="m-0 text-sm">Esta mascota ya se reencontró con su familia.</p>
                                    </div>
                                </div>
                            )}

                            {isOwn && <p className="m-0 mt-1 text-[13px] font-bold tracking-[.08em] uppercase">Esta es tu publicación</p>}

                            {!isOwn && !isResolved && (
                                <button
                                    onClick={handleOpenChat}
                                    className="h-[58px] rounded-[18px] bg-mimo-noche hover:bg-mimo-nocheAlt text-mimo-warm font-bold text-base flex items-center justify-center gap-2 transition-colors"
                                >
                                    <MessageCircle size={20} strokeWidth={2} />
                                    {isLost ? 'Enviar información' : 'Contactar al rescatista'}
                                </button>
                            )}

                            {/* Sin "Llamar": el contacto por una mascota perdida va SOLO por
                                el chat interno. Un teléfono expuesto no se puede retirar
                                después, no deja rastro moderable y es la vía habitual de las
                                estafas de "recompensa". El chat queda registrado y se puede
                                bloquear/denunciar. */}
                            <button
                                onClick={handleShare}
                                className="h-[54px] rounded-[18px] border-2 border-mimo-noche bg-transparent hover:bg-white font-bold text-[15px] flex items-center justify-center gap-2 transition-colors"
                            >
                                <Share2 size={18} strokeWidth={2} />
                                {copied ? 'Texto copiado, pegalo donde quieras' : 'Compartir'}
                            </button>

                            {isOwn && isResolved && (
                                <button onClick={handleReopen} className="mt-2 py-2 text-[15px] font-bold hover:text-mimo-coral">
                                    Reabrir reporte
                                </button>
                            )}

                            {isOwn && (
                                <button onClick={handleDelete} className="mt-2 py-2 flex items-center justify-center gap-2 text-[15px] font-bold hover:text-mimo-coral">
                                    <Trash2 size={18} strokeWidth={2} />
                                    Eliminar publicación
                                </button>
                            )}

                            {!isOwn && !isResolved && (
                                <p className="m-0 mt-0.5 flex items-start gap-2 text-[13px] leading-[1.45]">
                                    <ShieldCheck size={16} strokeWidth={2} className="shrink-0 mt-px" />
                                    Por tu seguridad, el contacto es solo por el chat de Mimo. Nunca compartas datos de pago.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function PetSkeleton() {
    return (
        <div className="flex-1 bg-mimo-warm">
            <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 xl:px-0 pt-7 pb-20 flex flex-col gap-6 animate-pulse" aria-label="Cargando">
                <div className="h-10 w-28 rounded-full bg-mimo-muted" />
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                    <div className="w-full lg:flex-[0_0_620px] h-[340px] lg:h-[520px] rounded-[32px] bg-mimo-muted" />
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="h-7 w-28 rounded-full bg-mimo-muted" />
                        <div className="h-12 w-2/3 rounded-2xl bg-mimo-muted" />
                        <div className="h-28 rounded-3xl bg-mimo-muted" />
                        <div className="h-[220px] rounded-3xl bg-mimo-muted" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Pet;
