import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Minus, X, ShieldCheck, ImagePlus, SendHorizontal, HeartHandshake, LoaderCircle } from 'lucide-react';
import { closeChat, fetchChatHistory, markChatAsRead, receiveMessage } from '../store/chatSlice';
import { markAsReadLocal } from '../store/inboxSlice';
import { resetDismissal, selectDonationVisible } from '../store/donationSlice';
import { C } from '../utils/theme';
import DonationBanner from './DonationBanner';

const API = import.meta.env.VITE_API_URL;
const MAX_SIDE = 1600; // mismo tope que la app antes de subir

const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) : '');

// Achica la foto a 1600 px de lado (JPEG) antes de subirla, como la app.
async function shrinkImage(file) {
    try {
        const bmp = await createImageBitmap(file);
        const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
        if (scale === 1 && file.type === 'image/jpeg') return file;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
        return blob || file;
    } catch {
        return file;
    }
}

function ChatWidget({ socket }) {
    const [text, setText] = useState('');
    const [pet, setPet] = useState(null);
    const [resolving, setResolving] = useState(false);
    const [sendError, setSendError] = useState('');
    const [minimized, setMinimized] = useState(false);
    const [uploading, setUploading] = useState(false);

    const { isOpen, activePet, activeChat: messages, loading, chatPage, chatTotalPages } = useSelector(state => state.chats);
    const user = useSelector((state) => state.user?.data);
    const token = useSelector((state) => state.user?.token);
    const donationVisible = useSelector(selectDonationVisible(activePet?.pet_id));

    const scrollRef = useRef(null);
    const dispatch = useDispatch();

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages, minimized]);

    // Al abrir el chat: historial + join room + fetch del pet para saber dueño/estado.
    useEffect(() => {
        if (!isOpen || !activePet) return;
        dispatch(fetchChatHistory({
            pet_id: activePet.pet_id,
            otherUserId: activePet.otherUserId,
        }));
        socket?.emit('join_pet_chat', { pet_id: activePet.pet_id });

        let active = true;
        fetch(`${API}/api/pets/${activePet.pet_id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (active && data) setPet(data); })
            .catch(() => {});
        return () => { active = false; };
    }, [isOpen, activePet, dispatch, socket, token]);

    // Al cerrar, limpiamos el estado local para no arrastrarlo al próximo chat.
    useEffect(() => {
        if (!isOpen) {
            setPet(null);
            setMinimized(false);
        }
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
            setSendError(typeof msg === 'string' ? msg : 'No se pudo enviar el mensaje.');
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

    const emitMessage = (payload) => {
        socket.emit('send_pet_message', {
            pet_id: activePet.pet_id,
            sender_id: user.id,
            senderName: user.name,
            receiver_id: activePet.otherUserId,
            petPhoto: activePet.petPhoto,
            ...payload,
        });
    };

    const send = (e) => {
        e.preventDefault();
        if (!text.trim() || !activePet) return;
        if (!socket || !user) {
            setSendError('No hay conexión al chat. Recargá la página.');
            return;
        }
        emitMessage({ content: text });
        setText('');
    };

    // Foto: se sube al servidor (que le saca los datos EXIF) y se manda la URL.
    const sendPhoto = async (file) => {
        if (!file || !activePet) return;
        if (!socket || !user) {
            setSendError('No hay conexión al chat. Recargá la página.');
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', await shrinkImage(file), 'foto.jpg');
            const res = await fetch(`${API}/api/messages/image`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo subir la foto.');
            emitMessage({ content: '', image_url: data.image_url });
        } catch (err) {
            setSendError(err.message);
            setTimeout(() => setSendError(''), 4000);
        } finally {
            setUploading(false);
        }
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
        if (!window.confirm(`¿Cerrar el caso?\n\nVas a marcar${pet?.name ? ` a ${pet.name}` : ''} como reunida. Se le avisa a la otra persona.`)) return;
        setResolving(true);
        try {
            const res = await fetch(`${API}/api/pets/${activePet.pet_id}/resolve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ resolved: true, resolved_with_user_id: Number(activePet.otherUserId) }),
            });
            if (!res.ok) throw new Error('resolve failed');
            const data = await res.json();
            setPet((prev) => prev ? { ...prev, resolved_at: data.resolved_at, resolved_with_user_id: data.resolved_with_user_id } : prev);
            dispatch(resetDismissal(activePet.pet_id));
        } catch {
            alert('No se pudo cerrar el caso. Probá de nuevo.');
        } finally {
            setResolving(false);
        }
    };

    if (!isOpen || !activePet) return null;

    const otherName = activePet.otherUserName || 'Usuario';
    // "Sobre Luna · Perdido" (o solo el estado si no tiene nombre).
    const stateLabel = !pet ? '' : pet.resolved_at ? 'Reencontrada' : pet.status === 'lost' ? 'Perdido' : 'Encontrado';
    const about = pet ? (pet.name ? `Sobre ${pet.name} · ${stateLabel}` : stateLabel) : '';
    const roundBtn = 'w-9 h-9 rounded-full bg-mimo-warm flex items-center justify-center hover:bg-mimo-muted';

    return (
        <div
            className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] bg-white rounded-[28px] shadow-[0_12px_40px_rgba(26,26,46,.18)] flex flex-col z-[999] animate-slide-up overflow-hidden font-sans text-mimo-noche ${minimized ? '' : 'h-[min(560px,calc(100vh-110px))]'}`}
            role="dialog"
            aria-label={`Chat con ${otherName}`}
        >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-mimo-muted">
                <span className="w-10 h-10 rounded-full bg-mimo-violeta text-mimo-warm flex items-center justify-center font-display font-black text-lg shrink-0">
                    {otherName.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0 flex flex-col">
                    <b className="text-[17px] truncate">{otherName}</b>
                    {about && <span className="text-[13px] truncate">{about}</span>}
                </span>
                <button onClick={() => setMinimized((v) => !v)} aria-label={minimized ? 'Abrir chat' : 'Minimizar chat'} className={roundBtn}>
                    <Minus size={18} strokeWidth={2} />
                </button>
                <button onClick={() => dispatch(closeChat())} aria-label="Cerrar chat" className={roundBtn}>
                    <X size={18} strokeWidth={2} />
                </button>
            </div>

            {!minimized && (
                <>
                    {isOwner && !isResolved && (
                        <button
                            onClick={doResolve}
                            disabled={resolving}
                            className="mx-4 mt-3 h-10 rounded-xl bg-mimo-teal text-mimo-noche text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50"
                        >
                            <HeartHandshake size={17} strokeWidth={2} />
                            {resolving ? 'Cerrando…' : '¿Se reencontraron? Cerrar el caso'}
                        </button>
                    )}

                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-mimo-warm/60">
                        <span className="self-center flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-xs">
                            <ShieldCheck size={14} strokeWidth={2} />
                            Si se encuentran, que sea en un lugar público.
                        </span>
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center"><LoaderCircle size={22} strokeWidth={2} className="animate-spin" /></div>
                        ) : (<>
                            {chatPage < chatTotalPages && (
                                <button
                                    onClick={() => dispatch(fetchChatHistory({ pet_id: activePet.pet_id, otherUserId: activePet.otherUserId, page: chatPage + 1 }))}
                                    className="self-center text-[13px] font-bold underline hover:text-mimo-coral"
                                >
                                    Ver mensajes anteriores
                                </button>
                            )}
                            {messages?.map((m, i) => {
                                const mine = Number(m.sender_id) === Number(user?.id);
                                const radius = mine ? 'rounded-[20px] rounded-br-md' : 'rounded-[20px] rounded-bl-md';
                                return (
                                    <div key={m.id || i} className={`flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
                                        {m.image_url && (
                                            <a href={m.image_url} target="_blank" rel="noopener noreferrer" className={`block w-[200px] h-[156px] overflow-hidden bg-mimo-muted ${radius}`}>
                                                <img src={m.image_url} alt="Foto del chat" className="w-full h-full object-cover" />
                                            </a>
                                        )}
                                        {m.content && (
                                            <div className={`px-3.5 py-2.5 text-[15px] leading-snug max-w-[82%] whitespace-pre-line break-words ${radius} ${mine ? 'bg-mimo-noche text-mimo-warm' : 'bg-white border border-mimo-muted'}`}>
                                                {m.content}
                                            </div>
                                        )}
                                        {m.created_at && <span className="text-[11px] px-1">{timeOf(m.created_at)}</span>}
                                    </div>
                                );
                            })}
                            {uploading && (
                                <div className="self-end flex items-center gap-2 px-3.5 py-2.5 rounded-[20px] rounded-br-md bg-mimo-noche/80 text-mimo-warm text-sm">
                                    <LoaderCircle size={16} strokeWidth={2} className="animate-spin" />
                                    Enviando foto…
                                </div>
                            )}
                            {iAmPartOfReunion && donationVisible ? (
                                <DonationBanner petId={activePet.pet_id} petName={pet?.name} />
                            ) : null}
                            {chatIsClosedElsewhere && (
                                <p className="m-0 p-3.5 rounded-2xl bg-white text-center text-sm">
                                    Este reporte ya se cerró: la familia se reencontró con otra persona.
                                </p>
                            )}
                        </>)}
                        <div ref={scrollRef} />
                    </div>

                    {sendError && <p className="m-0 px-4 pt-2 text-[13px] font-bold text-mimo-coral text-center" role="alert">{sendError}</p>}
                    <form onSubmit={send} className="p-3 border-t border-mimo-muted flex items-center gap-2">
                        <label
                            className={`w-11 h-11 rounded-full bg-mimo-warm flex items-center justify-center shrink-0 ${isResolved || uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:bg-mimo-muted'}`}
                            aria-label="Mandar una foto"
                        >
                            <ImagePlus size={20} strokeWidth={2} />
                            <input type="file" accept="image/*" className="hidden" disabled={isResolved || uploading} onChange={(e) => { sendPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                        </label>
                        <input
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onFocus={handleFocus}
                            placeholder={isResolved ? 'Caso cerrado: no se pueden mandar mensajes' : 'Escribí un mensaje…'}
                            disabled={isResolved}
                            aria-label="Mensaje"
                            className="flex-1 min-w-0 h-11 px-4 rounded-full bg-mimo-warm outline-none text-[15px] placeholder:text-mimo-noche/60 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={isResolved || !text.trim()}
                            aria-label="Enviar"
                            className="w-11 h-11 rounded-full bg-mimo-coral text-mimo-muted flex items-center justify-center shrink-0 hover:bg-mimo-coralDark disabled:opacity-50"
                            style={{ color: C.arena }}
                        >
                            <SendHorizontal size={20} strokeWidth={2} />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}

export default ChatWidget;
