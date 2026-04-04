import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeChat, fetchChatHistory, markChatAsRead, receiveMessage } from '../store/chatSlice';
import { markAsReadLocal } from '../store/inboxSlice';

function ChatWidget({ socket }) {
    const [text, setText] = useState('');


    // 👇 Traemos todo desde Redux
    const { isOpen, activePet, activeChat: messages, loading, chatPage, chatTotalPages } = useSelector(state => state.chats);
    const user = useSelector((state) => state.user?.data);
    const token = useSelector((state) => state.user?.token);


    const scrollRef = useRef(null);
    const dispatch = useDispatch();

    // Auto-scroll al último mensaje
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // 1. Escuchar evento de apertura (Simplificado)
    useEffect(() => {
        if (isOpen && activePet) {
            dispatch(fetchChatHistory({
                pet_id: activePet.pet_id,
                otherUserId: activePet.otherUserId
            }));
            socket.emit('join_pet_chat', { pet_id: activePet.pet_id });

        }
    }, [isOpen, activePet, dispatch, socket, token]);



    // 2. Socket: Recibir mensaje en tiempo real
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (data) => {
            // 🔥 Solo inyectamos el mensaje si es de este pet


            dispatch(receiveMessage(data));

            // Si el mensaje es del otro y tenemos el chat abierto, marcamos leído local
            if (data.sender_id !== user?.id) {
                dispatch(markAsReadLocal(data.pet_id));
            }

        };

        socket.on('receive_pet_message', handleReceiveMessage);
        return () => socket.off('receive_pet_message', handleReceiveMessage);
    }, [socket, user]);

    const handleFocus = () => {
        dispatch(markAsReadLocal(activePet?.pet_id))
        dispatch(markChatAsRead());
    }

    const send = (e) => {
        e.preventDefault();
        if (!text.trim() || !activePet) return;

        const payload = {
            pet_id: activePet.pet_id,
            sender_id: user.id,
            senderName: user.name,
            content: text,
            receiver_id: activePet.otherUserId,
            petPhoto: activePet.petPhoto
        };
        console.log(payload)

        socket.emit('send_pet_message', payload);
        setText('');
    };

    if (!isOpen || !activePet) return null;

    return (
        <div className="fixed bottom-6 right-6 w-[380px] h-[550px] bg-white rounded-[40px] shadow-2xl flex flex-col border border-gray-100 z-[999] animate-slide-up overflow-hidden">
            {/* Header (Mismo diseño tuyo) */}
            <div className="p-8 pb-6 border-b border-gray-50 flex flex-col items-center text-center relative bg-white">
                <button onClick={() => dispatch(closeChat())} className="absolute top-6 right-8 text-gray-300 hover:text-black transition-colors text-lg">✕</button>
                <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-sm bg-gray-50 mb-3">
                    <img src={activePet.petPhoto} className="w-full h-full object-cover" alt="Pet" />
                </div>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">Red Nigra</p>
                <p className="text-sm font-semibold text-gray-900 leading-tight">Hablando con {activePet.otherUserName}</p>
            </div>

            {/* Mensajes con estado de carga */}
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
                        <div key={i} className={`flex flex-col ${m.sender_id === user.id ? 'items-end' : 'items-start'}`}>
                            <div className={`p-4 rounded-3xl text-sm max-w-[85%] ${m.sender_id === user.id ? 'bg-black text-white' : 'bg-white shadow-sm border border-gray-100'}`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                </>)}
                <div ref={scrollRef} />
            </div>

            {/* Input (Mismo diseño tuyo) */}
            <form onSubmit={send} className="p-6 bg-white border-t border-gray-50 flex gap-2">
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onFocus={handleFocus}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-gray-100 border-none rounded-full px-6 py-3 text-sm focus:ring-1 focus:ring-black outline-none font-sans"
                />
                <button type="submit" className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                    →
                </button>
            </form>
        </div>
    );
}

export default ChatWidget;