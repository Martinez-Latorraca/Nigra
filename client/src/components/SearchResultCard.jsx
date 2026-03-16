import React from 'react';
import { useNavigate } from 'react-router-dom';

function SearchResultCard({ pet }) {
    const navigate = useNavigate();

    // Verificamos si el usuario está logueado leyendo el token
    const token = localStorage.getItem('petFinderToken');


    const matchPercentage = pet.visual_distance !== undefined
        ? ((1 - pet.visual_distance) * 100).toFixed(1)
        : null;

    // Función protegida para Llamar
    const handleCallClick = (e) => {
        if (!token) {
            e.preventDefault(); // Detenemos la llamada
            alert('⚠️ Debes registrarte o iniciar sesión para ver los datos de contacto.');
            navigate('/login'); // Lo mandamos a registrarse
            return;
        }
        // Si hay token, el enlace "tel:" funcionará normalmente
    };

    // Función protegida para Mensajes
    const handleSendMessage = async () => {
        if (!token) {
            alert('⚠️ Debes registrarte o iniciar sesión para enviar mensajes internos.');
            navigate('/login');
            return;
        }

        // Si está logueado, le pedimos el mensaje
        const messageText = window.prompt(`Escribe tu mensaje para ${pet.reporter_name || 'el usuario'}:`);

        if (!messageText || messageText.trim() === '') return;

        try {
            const response = await fetch('http://localhost:3000/api/pets/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiver_id: pet.reporter_id,
                    pet_id: pet.id,
                    content: messageText
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al enviar el mensaje');
            }

            alert('✅ ¡Mensaje enviado con éxito! El usuario lo verá en su perfil.');

        } catch (error) {
            console.error(error);
            alert(`❌ Error: ${error.message}`);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col sm:flex-row">

            {/* 1. Imagen con el Estado flotando */}
            <div className="relative w-full sm:w-48 h-56 sm:h-auto flex-shrink-0">
                <img
                    src={pet.photo_url}
                    alt={pet.description || 'Mascota'}
                    className="w-full h-full "
                />

                <div className={`absolute top-3 left-3 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 ${pet.status === 'lost' ? 'bg-pet-accent' : 'bg-pet-primary'}`}>
                    {pet.status === 'lost' ? '🚨 Perdido' : '✅ Encontrado'}
                </div>
            </div>

            {/* 2. Información */}
            <div className="p-5 flex flex-col justify-between w-full">
                <div>
                    <div className="flex justify-between mb-1 gap-2">
                        <p className="text-xs text-gray-400 font-semibold mb-2 mt-1">
                            👤 Reportado por: <span className="text-pet-dark">{pet.reporter_name || 'Usuario'}</span>
                        </p>

                        {matchPercentage && (
                            <span className="bg-pet-light/40 border border-pet-primary/20 text-pet-primaryDark text-xs font-extrabold px-2 py-1 rounded-md whitespace-nowrap flex items-center gap-1">
                                ✨ {matchPercentage}%
                            </span>
                        )}
                    </div>

                    <div className="flex justify-between mb-1 gap-2">
                        <p className="text-sm text-gray-500 capitalize flex items-center gap-2 mb-3">
                            {pet.type === 'dog' ? '🐶 Perro' : '🐱 Gato'} • {pet.color}
                        </p>

                        {pet.distance_km && (
                            <div className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 mb-2">
                                📍 A {parseFloat(pet.distance_km).toFixed(1)} km
                            </div>
                        )}
                    </div>

                    <h3 className="text-xl text-pet-primaryDark mb-2">
                        {pet.description !== 'Desconocido' ? pet.description : 'Sin descripción'}
                    </h3>
                </div>

                {/* 3. Botones de Acción PROTEGIDOS */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
                    <a
                        href={`tel:${pet.contact_info}`}
                        onClick={handleCallClick} // <-- Agregamos el interceptor aquí
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                    >
                        📞 Llamar
                    </a>

                    <button
                        onClick={handleSendMessage} // <-- Esta función ahora verifica el token primero
                        className="flex-[2] flex items-center justify-center gap-2 bg-pet-accent hover:opacity-90 text-white font-extrabold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm"
                    >
                        💬 Avisar a su Perfil
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SearchResultCard;