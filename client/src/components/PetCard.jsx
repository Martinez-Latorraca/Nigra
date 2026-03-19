import React from 'react';

function PetCard({ pet }) {
    const isLost = pet.status === 'lost';

    // Usamos una paleta minimalista: negro para perdidos, gris suave para encontrados
    const statusClasses = isLost
        ? 'bg-black text-white'
        : 'bg-gray-100 text-gray-600';

    const matchPercentage = pet.visual_distance !== undefined
        ? ((1 - pet.visual_distance) * 100).toFixed(0)
        : null;

    return (
        <div className="group bg-white rounded-[32px] shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-500 flex p-3 gap-5">

            {/* 1. Miniatura de Imagen */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 overflow-hidden rounded-2xl">
                <img
                    src={pet.photo_url}
                    alt="Registro"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
            </div>

            {/* 2. Información Editorial */}
            <div className="flex-1 py-1 pr-2 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full ${statusClasses}`}>
                            {isLost ? 'Perdido' : 'Encontrado'}
                        </span>

                        {matchPercentage && (
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                Match {matchPercentage}%
                            </span>
                        )}
                    </div>

                    <h3 className="text-lg font-semibold tracking-tight text-gray-900 leading-tight mb-1 truncate max-w-[180px] sm:max-w-none">
                        {pet.description !== 'Desconocido' ? pet.description : 'Sin descripción'}
                    </h3>

                    <p className="text-xs font-medium text-gray-400 capitalize">
                        {pet.type === 'dog' ? 'Canino' : 'Felino'} • {pet.color}
                    </p>
                </div>

                {/* 3. Datos Técnicos y Contacto */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    {pet.distance_km ? (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                            📍 {parseFloat(pet.distance_km).toFixed(1)} km
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-gray-200 uppercase tracking-tight">
                            Posición remota
                        </span>
                    )}

                    <a
                        href={`tel:${pet.contact_info}`}
                        className="text-xs font-semibold text-black hover:opacity-60 transition-opacity underline underline-offset-4 decoration-gray-200"
                    >
                        Contactar
                    </a>
                </div>
            </div>
        </div>
    );
}

export default PetCard;