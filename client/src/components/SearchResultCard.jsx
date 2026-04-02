import { useNavigate } from 'react-router-dom';
import { translateColor, translateType } from '../utils/translations';

function SearchResultCard({ pet }) {
    const navigate = useNavigate();

    const matchPercentage = pet.visual_distance !== undefined
        ? ((1 - pet.visual_distance) * 100).toFixed(0)
        : null;

    const handleButtonClick = () => {
        navigate(`/pet/${pet.id}`);
    };

    return (
        <div className="group bg-white rounded-[32px] shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden hover:shadow-[0_15px_35px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col sm:flex-row p-3 gap-6">

            {/* Imagen con bordes redondeados internos */}
            <div className="relative w-full sm:w-56 h-64 sm:h-56 flex-shrink-0 overflow-hidden rounded-[24px]">
                <img
                    src={pet.photo_url}
                    alt={`${translateType(pet.type) || 'Mascota'} ${translateColor(pet.color) ? 'de color ' + translateColor(pet.color) : ''} - ${pet.status === 'lost' ? 'Perdido' : 'Encontrado'}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                <div className={`absolute top-4 left-4 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full shadow-sm ${pet.status === 'lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {pet.status === 'lost' ? 'Perdido' : 'Encontrado'}
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 py-2 pr-4 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.15em]">Informante</span>
                            <p className="text-sm font-semibold text-gray-900">{pet.reporter_name || 'Usuario Anónimo'}</p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            {matchPercentage && (
                                <div className="bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
                                    <span className="text-[11px] font-bold text-pet-primary tracking-tighter">Coincidencia {matchPercentage}%</span>
                                </div>
                            )}
                            {pet.distance_km && (
                                <div className="px-3 text-[11px] font-bold text-gray-400 tracking-tight">
                                    A {parseFloat(pet.distance_km).toFixed(1)} km
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-2xl font-semibold tracking-tight text-black mb-1 leading-tight">
                            {pet.description !== 'Desconocido' ? pet.description : 'Sin descripción detallada'}
                        </h3>
                        <p className="text-sm font-medium text-gray-400 capitalize">
                            {translateType(pet.type)} • {translateColor(pet.color)}
                        </p>
                    </div>
                </div>

                {/* Acciones Finales */}
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={handleButtonClick}
                        className="flex-1 bg-black text-white text-xs font-semibold py-4 rounded-full hover:bg-gray-800 transition-all shadow-sm active:scale-95"
                    >
                        Mas información
                    </button>


                </div>
            </div>
        </div>
    );
}

export default SearchResultCard;