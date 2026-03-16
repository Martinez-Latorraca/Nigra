import React from 'react';

function PetCard({ pet }) {
    // Verificamos si la mascota se reportó como perdida o encontrada
    const isLost = pet.status === 'lost';

    // Asignamos colores semánticos según el estado
    const statusColor = isLost ? 'bg-pet-accent' : 'bg-pet-primary';
    const statusText = isLost ? 'Perdido' : 'Encontrado';

    // Truco matemático: Convertimos la "distancia" del vector en un porcentaje de coincidencia
    const matchPercentage = pet.visual_distance !== undefined
        ? ((1 - pet.visual_distance) * 100).toFixed(1)
        : null;

    return (
        <div className="flex bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">

            {/* 1. Columna de la Imagen */}
            <div className="w-1/3 min-w-[120px] h-36 sm:h-auto">
                <img
                    src={pet.photo_url}
                    alt={pet.description || 'Mascota'}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* 2. Columna de la Información */}
            <div className="w-2/3 p-4 flex flex-col justify-between">

                <div>
                    <div className="flex justify-between items-start mb-1 gap-2">
                        <h3 className="font-bold text-lg text-pet-primaryDark truncate">
                            {pet.description !== 'Desconocido' ? pet.description : 'Sin descripción'}
                        </h3>
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-lg text-white ${statusColor}`}>
                            {statusText}
                        </span>
                    </div>

                    <p className="text-sm text-gray-500 capitalize flex items-center gap-1">
                        {pet.type === 'dog' ? '🐶 Perro' : '🐱 Gato'} •
                        <span className="truncate">{pet.color}</span>
                    </p>

                    {/* Contenedor de Insignias (IA y Mapa) */}
                    <div className="mt-2 flex flex-wrap gap-2">
                        {/* Insignia: Porcentaje de similitud de la IA */}
                        {matchPercentage && (
                            <div className="text-xs font-semibold text-pet-primaryDark bg-pet-light/50 px-2 py-1 rounded-md border border-pet-light">
                                ✨ {matchPercentage}% de similitud
                            </div>
                        )}

                        {/* Insignia: Distancia geográfica */}
                        {pet.distance_km && (
                            <div className="text-xs font-semibold text-pet-accent bg-red-50 px-2 py-1 rounded-md border border-red-100">
                                📍 A {parseFloat(pet.distance_km).toFixed(1)} km
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Acción (Contacto) */}
                <div className="mt-3">
                    <a
                        href={`tel:${pet.contact_info}`}
                        className="text-sm font-bold text-pet-primary hover:text-pet-primaryDark flex items-center gap-1 transition-colors"
                    >
                        📞 Contactar: <span className="underline decoration-pet-light underline-offset-2">{pet.contact_info}</span>
                    </a>
                </div>

            </div>
        </div>
    );
}

export default PetCard;