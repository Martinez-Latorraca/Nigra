import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
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
                body: data.content,
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

    const kicker = banner.kind === 'match' ? 'text-blue-500' : 'text-pet-primary';
    const borderColor = banner.kind === 'match' ? 'border-l-blue-500' : 'border-l-pet-primary';

    const handleClick = () => {
        banner.onTap?.();
        setBanner(null);
    };

    const handleClose = (e) => {
        e.stopPropagation();
        setBanner(null);
    };

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[400px] animate-slide-down">
            <div
                onClick={handleClick}
                className={`bg-white/80 backdrop-blur-2xl border border-white/20 border-l-4 ${borderColor} rounded-[32px] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform`}
            >
                <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm bg-gray-100">
                    {banner.photo ? (
                        <img src={banner.photo} className="w-full h-full object-cover" alt="" />
                    ) : null}
                </div>

                <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-left ${kicker}`}>
                        {banner.title}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 leading-tight text-left truncate">
                        {banner.body}
                    </p>
                </div>

                <button
                    onClick={handleClose}
                    className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors p-1 -mr-1"
                    aria-label="Cerrar"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default NotificationToast;
