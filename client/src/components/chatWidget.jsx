import { useState, useEffect, useRef } from 'react';

function ChatWidget({ socket }) {
    const [activePet, setActivePet] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const user = JSON.parse(localStorage.getItem('petFinderUser') || '{}');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // 1. Escuchar eventos de apertura
    useEffect(() => {
        const handleOpen = async (e) => {
            const { petId } = e.detail;
            setActivePet(e.detail);
            setIsOpen(true);

            const token = localStorage.getItem('petFinderToken'); // 👈 Sacamos el token

            try {
                const response = await fetch(`http://localhost:3000/api/pets/${petId}/messages`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`, // 👈 Lo mandamos aquí
                        'Content-Type': 'application/json'
                    }
                });

                if (response.status === 401) {
                    console.error("No estás autorizado. Revisá el token.");
                    return;
                }

                const history = await response.json();

                // Mapeamos para que coincidan los nombres (sender_id -> senderId)
                const formattedHistory = history.map(m => ({
                    ...m,
                    senderId: m.sender_id,
                    content: m.content
                }));

                setMessages(formattedHistory);
            } catch (err) {
                console.error("Error cargando historial:", err);
            }

            socket.emit('join_pet_chat', { petId });
        };

        window.addEventListener('openPetChat', handleOpen);
        return () => window.removeEventListener('openPetChat', handleOpen);
    }, [socket]);

    // 2. Escuchar mensajes del servidor
    useEffect(() => {
        socket.on('receive_pet_message', (newMsg) => {
            // console.log("📩 Mensaje recibido desde el server:", newMsg);
            setMessages(prev => [...prev, newMsg]);
        });

        return () => socket.off('receive_pet_message');
    }, [socket]);

    const send = (e) => {
        e.preventDefault();
        if (!text.trim() || !activePet) return;

        const payload = {
            petId: activePet.petId,
            senderId: user.id,
            senderName: user.name,
            content: text,
            petPhoto: activePet.petPhoto,
            receiverId: activePet.reporterId
        };

        socket.emit('send_pet_message', payload);
        setText('');
    };

    if (!isOpen || !activePet) return null;

    return (
        <div className="fixed bottom-6 right-6 w-[380px] h-[550px] bg-white rounded-[40px] shadow-2xl flex flex-col border border-gray-100 z-[999] animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="p-8 pb-6 border-b border-gray-50 flex flex-col items-center text-center relative bg-white">
                <button onClick={() => setIsOpen(false)} className="absolute top-6 right-8 text-gray-300 hover:text-black transition-colors text-lg">✕</button>
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-sm bg-gray-50 mb-4">
                    <img src={activePet.petPhoto} className="w-full h-full object-cover" alt="Pet" />
                </div>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1 font-sans">Canal de Rescate</p>
                <p className="text-sm font-semibold text-gray-900 font-sans">Informante: {activePet.reporterName}</p>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 flex flex-col font-sans">
                {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.senderId === user.id ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-3xl text-sm ${m.senderId === user.id ? 'bg-black text-white' : 'bg-white shadow-sm border border-gray-100'}`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                <div ref={scrollRef} />
            </div>

            {/* Input */}
            <form onSubmit={send} className="p-6 bg-white border-t border-gray-50 flex gap-2">
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-gray-100 border-none rounded-full px-6 py-3 text-sm focus:ring-1 focus:ring-black outline-none transition-all font-sans"
                />
                <button type="submit" className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                    →
                </button>
            </form>
        </div>
    );
}

export default ChatWidget;