import React from 'react';
import { translateColor, translateType } from '../utils/translations';

function PetCard({ pet }) {
    const isLost = pet.status === 'lost';

    // Colores Apple: Blanco y Negro puro para estados
    const statusClasses = isLost
        ? 'bg-black text-white'
        : 'bg-gray-100 text-gray-500';

    const matchPercentage = pet.visual_distance !== undefined
        ? ((1 - pet.visual_distance) * 100).toFixed(0)
        : null;

    return (
        <div className="group bg-white rounded-[32px] p-4 flex items-center gap-6 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1">

            {/* 1. Imagen: Formato cuadrado perfecto con radio Apple */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 overflow-hidden rounded-[24px] bg-[#F5F5F7]">
                <img
                    src={pet.photo_url}
                    alt={`${translateType(pet.type) || 'Mascota'} ${translateColor(pet.color) ? 'de color ' + translateColor(pet.color) : ''} - ${pet.status === 'lost' ? 'Perdido' : 'Encontrado'}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
            </div>

            {/* 2. Contenido: Jerarquía tipográfica San Francisco style */}
            <div className="flex-1 flex flex-col justify-between py-1 pr-2">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full ${statusClasses}`}>
                            {isLost ? 'Perdido' : 'Encontrado'}
                        </span>

                        {matchPercentage && (
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Match</span>
                                <span className="text-xs font-semibold text-black leading-none">{matchPercentage}%</span>
                            </div>
                        )}
                    </div>

                    <h3 className="text-xl font-semibold tracking-tighter text-gray-900 leading-tight mb-1 truncate max-w-[150px] sm:max-w-none">
                        {pet.description !== 'Desconocido' ? pet.description : 'Sin nombre'}
                    </h3>

                    <p className="text-sm font-medium text-gray-400 capitalize">
                        {translateType(pet.type)} • {translateColor(pet.color)}
                    </p>
                </div>

                {/* 3. Footer de la Card: Datos técnicos limpios */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        {pet.distance_km ? (
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                📍 {parseFloat(pet.distance_km).toFixed(1)} km
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-gray-200 uppercase tracking-tight">
                                Nigra ID
                            </span>
                        )}
                    </div>

                    <a
                        href={`tel:${pet.contact_info}`}
                        className="text-xs font-semibold text-black hover:opacity-60 transition-opacity flex items-center gap-1"
                    >
                        Contactar
                        <span className="text-[14px]">↗</span>
                    </a>
                </div>
            </div>
        </div>
    );
}

export default PetCard;