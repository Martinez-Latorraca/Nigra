import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScanSearch, MessageCircle, X } from 'lucide-react';
import { openChat } from '../store/chatSlice';

// Toast in-app: aparece si llega un mensaje o match y NO estás ya en la
// pantalla correspondiente. Tap → abre chat o navega a pet. Auto-cierra 5s.
function NotificationToast({ socket }) {
    const [banner, setBanner] = useState(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!banner) return;
        const t = setTimeout(() => setBanner(null), 5000);
        return () => clearTimeout(t);
    }, [banner]);

    useEffect(() => {
        if (!socket) return;

        const onChat = (data) => {
            // Si el chat widget del web ya está abierto en esa mascota,
            // el ChatWidget maneja el mensaje in-place. Skip toast.
            setBanner({
                kind: 'chat',
                title: `${data.senderName || 'Alguien'} te escribió`,
                body: data.content || (data.image_url ? 'Te mandó una foto' : ''),
                photo: data.petPhoto,
                onTap: () => dispatch(openChat({
                    pet_id: data.pet_id,
                    petPhoto: data.petPhoto,
                    otherUserId: data.sender_id,
                    otherUserName: data.senderName,
                })),
            });
        };

        const onMatch = (notif) => {
            const petId = notif?.data?.pet_id;
            const inPet = petId != null && location.pathname === `/pet/${petId}`;
            if (inPet) return;
            setBanner({
                kind: 'match',
                title: 'Posible coincidencia',
                body: `Reportaron una mascota similar${notif?.data?.match_name ? ` a ${notif.data.match_name}` : ''}. ¿Es la tuya?`,
                photo: notif?.data?.photo_url,
                onTap: () => petId && navigate(`/pet/${petId}`),
            });
        };

        socket.on('new_notification', onChat);
        socket.on('new_match_notification', onMatch);

        return () => {
            socket.off('new_notification', onChat);
            socket.off('new_match_notification', onMatch);
        };
    }, [socket, dispatch, navigate, location.pathname]);

    if (!banner) return null;

    const handleClick = () => {
        banner.onTap?.();
        setBanner(null);
    };

    const handleClose = (e) => {
        e.stopPropagation();
        setBanner(null);
    };

    // Aviso arriba a la derecha (Web-chat): ícono Coral para coincidencias,
    // foto de la mascota para mensajes.
    return (
        <div className="fixed top-[88px] right-4 left-4 sm:left-auto sm:w-[408px] z-[1000] animate-slide-up font-sans text-mimo-noche" role="status">
            <div
                onClick={handleClick}
                className="bg-white rounded-3xl p-3.5 shadow-[0_12px_40px_rgba(26,26,46,.18)] flex items-start gap-3.5 cursor-pointer"
            >
                {banner.kind === 'match' || !banner.photo ? (
                    <span className="w-11 h-11 rounded-[14px] bg-mimo-coral flex items-center justify-center shrink-0">
                        {banner.kind === 'match'
                            ? <ScanSearch size={22} strokeWidth={2} color="#F0EBE8" />
                            : <MessageCircle size={22} strokeWidth={2} color="#F0EBE8" />}
                    </span>
                ) : (
                    <img src={banner.photo} alt="" className="w-11 h-11 rounded-[14px] object-cover shrink-0 bg-mimo-muted" />
                )}
                <div className="flex-1 min-w-0">
                    <p className="m-0 text-[15px] font-bold leading-tight">{banner.title}</p>
                    <p className="m-0 mt-0.5 text-sm leading-snug line-clamp-2">{banner.body}</p>
                </div>
                <button onClick={handleClose} className="shrink-0 p-1 -mr-1 hover:text-mimo-coral" aria-label="Cerrar">
                    <X size={18} strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}

export default NotificationToast;
