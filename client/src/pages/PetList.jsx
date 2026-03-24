import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function PetList() {
    const [pets, setPets] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- ESTADOS DE FILTRO ---
    const [filterType, setFilterType] = useState('all');
    const [filterColor, setFilterColor] = useState('all');
    const [filterDate, setFilterDate] = useState('all'); // 'all', 'today', 'week', 'month'

    useEffect(() => {
        const fetchAllPets = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/pets');
                const data = await response.json();
                setPets(data);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllPets();
    }, []);

    // 1. Extraemos colores únicos de la data para el dropdown
    const availableColors = ['all', ...new Set(pets.map(p => p.color).filter(Boolean))];

    // 2. Lógica de Filtrado Compuesta
    const filteredPets = pets.filter(pet => {
        // Filtro por Tipo
        const matchesType = filterType === 'all' || pet.type === filterType;

        // Filtro por Color
        const matchesColor = filterColor === 'all' || pet.color === filterColor;

        // Filtro por Fecha
        let matchesDate = true;
        if (filterDate !== 'all') {
            const petDate = new Date(pet.created_at);
            const now = new Date();
            const diffDays = (now - petDate) / (1000 * 60 * 60 * 24);

            if (filterDate === 'today') matchesDate = diffDays <= 1;
            if (filterDate === 'week') matchesDate = diffDays <= 7;
            if (filterDate === 'month') matchesDate = diffDays <= 30;
        }

        return matchesType && matchesColor && matchesDate;
    });

    if (loading) return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-sans">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Sincronizando...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F5F5F7] p-6 md:p-12 font-sans text-gray-900 pb-24">

            {/* --- HEADER --- */}
            <div className="max-w-7xl mx-auto mb-12">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2 block">Explorar Base de Datos</span>
                <h1 className="text-6xl md:text-7xl font-semibold tracking-tighter text-black mb-10">Comunidad.</h1>

                {/* --- BARRA DE FILTROS --- */}
                <div className="flex flex-wrap gap-4 items-center bg-white/50 p-4 rounded-[32px] border border-gray-100 backdrop-blur-xl">

                    {/* Filtro Tipo */}
                    <div className="flex flex-col gap-1.5 px-4 border-r border-gray-200">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Especie</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent text-sm font-semibold outline-none cursor-pointer"
                        >
                            <option value="all">Todas</option>
                            <option value="dog">Perros</option>
                            <option value="cat">Gatos</option>
                        </select>
                    </div>

                    {/* Filtro Color */}
                    <div className="flex flex-col gap-1.5 px-4 border-r border-gray-200">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Color predominante</label>
                        <select
                            value={filterColor}
                            onChange={(e) => setFilterColor(e.target.value)}
                            className="bg-transparent text-sm font-semibold outline-none cursor-pointer capitalize"
                        >
                            {availableColors.map(c => (
                                <option key={c} value={c}>{c === 'all' ? 'Cualquier color' : c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro Fecha */}
                    <div className="flex flex-col gap-1.5 px-4">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Antigüedad</label>
                        <select
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-transparent text-sm font-semibold outline-none cursor-pointer"
                        >
                            <option value="all">Cualquier fecha</option>
                            <option value="today">Últimas 24hs</option>
                            <option value="week">Última semana</option>
                            <option value="month">Último mes</option>
                        </select>
                    </div>

                    <div className="ml-auto pr-4">
                        <span className="text-[10px] font-bold text-pet-link bg-pet-link/10 px-3 py-1 rounded-full uppercase">
                            {filteredPets.length} resultados
                        </span>
                    </div>
                </div>
            </div>

            {/* --- GRILLA --- */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white/30 rounded-[48px] border-2 border-dashed border-gray-200">
                        {/* Icono sutil de búsqueda vacía */}
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                            </svg>
                        </div>

                        <h3 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
                            No encontramos coincidencias
                        </h3>
                        <p className="text-sm text-gray-400 font-medium mb-8 text-center max-w-xs">
                            Probá cambiando los filtros de especie, color o fecha para ver más resultados.
                        </p>

                        {/* Botón para resetear filtros */}
                        <button
                            onClick={() => {
                                setFilterType('all');
                                setFilterColor('all');
                                setFilterDate('all');
                            }}
                            className="px-8 py-3 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10"
                        >
                            Limpiar todos los filtros
                        </button>
                    </div>
                ) : (
                    filteredPets.map(pet => (
                        <Link
                            to={`/pet/${pet.id}`}
                            key={pet.id}
                            className="group bg-white rounded-[40px] p-5 flex flex-col gap-5 border border-gray-100 hover:shadow-[0_30px_60px_rgba(0,0,0,0.06)] transition-all duration-500"
                        >
                            <div className="relative w-full aspect-[4/3] rounded-[28px] overflow-hidden bg-gray-100">
                                <img src={pet.photo_url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="pet" />
                                <div className="absolute top-4 left-4">
                                    <span className={`text-[8px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg ${pet.status === 'lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                        {pet.status === 'lost' ? 'Buscando' : 'Hallado'}
                                    </span>
                                </div>
                            </div>

                            <div className="px-2">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-bold text-pet-primary uppercase tracking-[0.2em]">{pet.type === 'dog' ? 'Canino' : 'Felino'} • {pet.color}</span>
                                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">#{pet.id}</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 leading-tight line-clamp-2 min-h-[3rem]">{pet.description}</h3>
                            </div>

                            {pet.lat && (
                                <div className="h-28 rounded-[24px] overflow-hidden border border-gray-50 grayscale group-hover:grayscale-0 transition-all">
                                    <MapContainer center={[pet.lat, pet.lng]} zoom={17} zoomControl={false} scrollWheelZoom={false} dragging={false} className="w-full h-full z-0">
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                        <Marker position={[pet.lat, pet.lng]} />
                                    </MapContainer>
                                </div>
                            )}

                            <div className="px-2 pt-2 flex justify-between items-center border-t border-gray-50">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Subido el {new Date(pet.created_at).toLocaleDateString()}</span>
                                <div className="text-gray-200 group-hover:text-black transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14m-7-7 7 7-7 7" /></svg></div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

        </div>
    );
}

export default PetList;