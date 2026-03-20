import { useState, useEffect } from 'react';

function NotificationToast({ socket }) {
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        socket.on('new_notification', (data) => {
            // new Audio('/ios_notification.mp3').play();

            console.log(data)
            setNotification(data);

            // Desaparece automáticamente tras 5 segundos
            setTimeout(() => setNotification(null), 5000);
        });

        return () => socket.off('new_notification');
    }, [socket]);

    const handleToastClick = () => {
        const event = new CustomEvent('openPetChat', {
            detail: {
                petId: notification.petId,
                petPhoto: notification.petPhoto,
                reporterName: notification.senderName || 'Usuario', // Datos que vengan en la notificación
                reporterId: notification.senderId
            }
        });
        window.dispatchEvent(event);
        setNotification(null); // Cerramos el toast al hacer clic
    };


    if (!notification) return null;

    return (
        <div onClick={handleToastClick} className="cursor-pointer fixed top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[400px] animate-slide-down">
            <div className="bg-white/80 backdrop-blur-2xl border border-white/20 rounded-[32px] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform">

                <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                    <img src={notification.petPhoto} className="w-full h-full object-cover" alt="pet" />
                </div>

                <div className="flex-1">
                    <p className="text-[10px] font-bold text-pet-primary uppercase tracking-[0.2em] mb-0.5 text-left">{notification.senderName}</p>
                    <p className="text-sm font-semibold text-gray-900 leading-tight text-left">
                        {notification.content}
                    </p>
                </div>


            </div>
        </div>
    );
}

export default NotificationToast;