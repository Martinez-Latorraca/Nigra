import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeChat, fetchChatHistory, markChatAsRead, receiveMessage } from '../store/chatSlice';
import { markAsReadLocal } from '../store/inboxSlice';
import { resetDismissal, selectDonationVisible } from '../store/donationSlice';
import DonationBanner from './DonationBanner';

function ChatWidget({ socket }) {
    const [text, setText] = useState('');
    const [pet, setPet] = useState(null);
    const [resolving, setResolving] = useState(false);
    const [sendError, setSendError] = useState('');

    const { isOpen, activePet, activeChat: messages, loading, chatPage, chatTotalPages } = useSelector(state => state.chats);
    const user = useSelector((state) => state.user?.data);
    const token = useSelector((state) => state.user?.token);
    const donationVisible = useSelector(selectDonationVisible(activePet?.pet_id));

    const scrollRef = useRef(null);
    const dispatch = useDispatch();

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Al abrir el chat: historial + join room + fetch del pet para saber owner/resolved.
    useEffect(() => {
        if (!isOpen || !activePet) return;
        dispatch(fetchChatHistory({
            pet_id: activePet.pet_id,
            otherUserId: activePet.otherUserId,
        }));
        socket?.emit('join_pet_chat', { pet_id: activePet.pet_id });

        let active = true;
        fetch(`${import.meta.env.VITE_API_URL}/api/pets/${activePet.pet_id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (active && data) setPet(data); })
            .catch(() => {});
        return () => { active = false; };
    }, [isOpen, activePet, dispatch, socket, token]);

    // Al cerrar el widget, limpiamos el pet local para no arrastrar estado stale
    useEffect(() => {
        if (!isOpen) setPet(null);
    }, [isOpen]);

    // Sockets: mensajes + resolve/reopen
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (data) => {
            dispatch(receiveMessage(data));
            if (data.sender_id !== user?.id) {
                dispatch(markAsReadLocal(data.pet_id));
            }
        };
        const handleResolved = (payload) => {
            if (!activePet || Number(payload.pet_id) !== Number(activePet.pet_id)) return;
            setPet((prev) => prev ? {
                ...prev,
                resolved_at: payload.resolved_at,
                resolved_with_user_id: payload.resolved_with_user_id,
            } : prev);
        };
        const handleReopened = (payload) => {
            if (!activePet || Number(payload.pet_id) !== Number(activePet.pet_id)) return;
            setPet((prev) => prev ? { ...prev, resolved_at: null, resolved_with_user_id: null } : prev);
            dispatch(resetDismissal(activePet.pet_id));
        };

        const handleError = (msg) => {
            setSendError(typeof msg === 'string' ? msg : 'Error al enviar el mensaje');
            setTimeout(() => setSendError(''), 4000);
        };

        socket.on('receive_pet_message', handleReceiveMessage);
        socket.on('pet_resolved', handleResolved);
        socket.on('pet_reopened', handleReopened);
        socket.on('error_notification', handleError);
        return () => {
            socket.off('receive_pet_message', handleReceiveMessage);
            socket.off('pet_resolved', handleResolved);
            socket.off('pet_reopened', handleReopened);
            socket.off('error_notification', handleError);
        };
    }, [socket, user, activePet, dispatch]);

    const handleFocus = () => {
        dispatch(markAsReadLocal(activePet?.pet_id));
        dispatch(markChatAsRead());
    };

    const send = (e) => {
        e.preventDefault();
        if (!text.trim() || !activePet) return;
        if (!socket || !user) {
            setSendError('No hay conexión al chat. Recargá la página.');
            return;
        }
        socket.emit('send_pet_message', {
            pet_id: activePet.pet_id,
            sender_id: user.id,
            senderName: user.name,
            content: text,
            receiver_id: activePet.otherUserId,
            petPhoto: activePet.petPhoto,
        });
        setText('');
    };

    const isOwner = pet && Number(pet.user_id) === Number(user?.id);
    const isResolved = pet && pet.resolved_at != null;
    const iAmPartOfReunion = pet && (
        (isOwner && Number(pet.resolved_with_user_id) === Number(activePet?.otherUserId)) ||
        (!isOwner && Number(pet.resolved_with_user_id) === Number(user?.id))
    );
    const chatIsClosedElsewhere = isResolved && !iAmPartOfReunion;

    const doResolve = async () => {
        if (!activePet) return;
        if (!window.confirm(`¿Cerrar el caso?\n\nVas a marcar${pet?.name ? ` a ${pet.name}` : ''} como reunida. Se le avisa a la otra persona y verán un mensaje de gracias.`)) return;
        setResolving(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/${activePet.pet_id}/resolve`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    resolved: true,
                    resolved_with_user_id: Number(activePet.otherUserId),
                }),
            });
            if (!res.ok) throw new Error('resolve failed');
            const data = await res.json();
            setPet((prev) => prev ? {
                ...prev,
                resolved_at: data.resolved_at,
                resolved_with_user_id: data.resolved_with_user_id,
            } : prev);
            dispatch(resetDismissal(activePet.pet_id));
        } catch (e) {
            alert('No se pudo cerrar el caso. Probá de nuevo.');
        } finally {
            setResolving(false);
        }
    };

    if (!isOpen || !activePet) return null;

    return (
        <div className="fixed bottom-6 right-6 w-[380px] h-[550px] bg-white rounded-[40px] shadow-2xl flex flex-col border border-gray-100 z-[999] animate-slide-up overflow-hidden">
            <div className="p-8 pb-6 border-b border-gray-50 flex flex-col items-center text-center relative bg-white">
                <button onClick={() => dispatch(closeChat())} className="absolute top-6 right-8 text-gray-300 hover:text-black transition-colors text-lg">✕</button>
                <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-sm bg-gray-50 mb-3">
                    <img src={activePet.petPhoto} className="w-full h-full object-cover" alt="Pet" />
                </div>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">
                    {isResolved ? 'Caso cerrado ✓' : 'Comunidad Mimo'}
                </p>
                <p className="text-sm font-semibold text-gray-900 leading-tight">Hablando con {activePet.otherUserName}</p>
                {isOwner && !isResolved ? (
                    <button
                        onClick={doResolve}
                        disabled={resolving}
                        className="mt-4 text-[10px] font-bold bg-black text-white px-4 py-2 rounded-full uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {resolving ? 'Cerrando…' : 'Cerrar caso'}
                    </button>
                ) : null}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">Sincronizando...</div>
                ) : (<>
                    {chatPage < chatTotalPages && (
                        <button
                            onClick={() => dispatch(fetchChatHistory({ pet_id: activePet.pet_id, otherUserId: activePet.otherUserId, page: chatPage + 1 }))}
                            className="self-center text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest py-2 transition-colors"
                        >
                            Cargar anteriores
                        </button>
                    )}
                    {messages?.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                            <div className={`p-4 rounded-3xl text-sm max-w-[85%] ${m.sender_id === user?.id ? 'bg-black text-white' : 'bg-white shadow-sm border border-gray-100'}`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {iAmPartOfReunion && donationVisible ? (
                        <DonationBanner petId={activePet.pet_id} petName={pet?.name} />
                    ) : null}
                    {chatIsClosedElsewhere ? (
                        <div className="bg-white border border-gray-100 rounded-3xl p-4 text-center text-xs text-gray-500 italic">
                            Este reporte ya se cerró — el dueño se reunió con otra persona.
                        </div>
                    ) : null}
                </>)}
                <div ref={scrollRef} />
            </div>

            {sendError ? (
                <div className="px-6 pt-2 pb-1 bg-white text-[11px] text-red-500 font-semibold text-center">
                    {sendError}
                </div>
            ) : null}
            <form onSubmit={send} className="p-6 bg-white border-t border-gray-50 flex gap-2">
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onFocus={handleFocus}
                    placeholder={isResolved ? 'Caso cerrado — no se pueden enviar mensajes' : 'Escribe un mensaje...'}
                    disabled={isResolved}
                    className={`flex-1 bg-gray-100 border-none rounded-full px-6 py-3 text-sm focus:ring-1 focus:ring-black outline-none font-sans ${isResolved ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <button
                    type="submit"
                    disabled={isResolved}
                    className={`w-12 h-12 bg-black text-white rounded-full flex items-center justify-center ${isResolved ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 transition-all'}`}>
                    →
                </button>
            </form>
        </div>
    );
}

export default ChatWidget;
