import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Arreglo técnico de los íconos
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// 1. Sub-componente para detectar clics manuales en el mapa
function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });
    return position === null ? null : <Marker position={position}></Marker>;
}

// 2. NUEVO: Sub-componente para hacer que la cámara del mapa "vuele" a la nueva dirección
function MapUpdater({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 15); // 15 es el nivel de zoom al acercarse
        }
    }, [position, map]);
    return null;
}

function MapSelector({ position, setPosition }) {
    // Centro por defecto (Montevideo)
    const defaultCenter = [-34.9011, -56.1645];

    // Estados para el buscador
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // 3. NUEVO: Función que le pregunta a OpenStreetMap por la dirección
    const handleSearch = async (e) => {
        e.preventDefault(); // Evita que la página recargue si apretan Enter
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            // Usamos la API gratuita de Nominatim
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                // Tomamos el primer resultado devuelto
                const newPos = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                setPosition(newPos); // Esto pondrá el pin
            } else {
                alert("📍 Dirección no encontrada. Intenta ser más específico (ej: 'Avenida 18 de Julio, Montevideo').");
            }
        } catch (error) {
            console.error("Error buscando dirección:", error);
            alert("❌ Hubo un error de conexión al buscar la dirección.");
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">

            {/* EL BUSCADOR DE DIRECCIONES */}
            <form onSubmit={handleSearch} className="flex gap-2 relative z-10">
                <input
                    type="text"
                    placeholder="Ej: Bulevar Artigas y Rivera, Montevideo"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-pet-dark focus:ring-2 focus:ring-pet-primary outline-none shadow-sm text-sm"
                />
                <button
                    type="submit"
                    disabled={isSearching}
                    className="px-6 py-3 bg-pet-dark hover:bg-black text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 text-sm whitespace-nowrap"
                >
                    {isSearching ? '⏳' : '🔍 Buscar'}
                </button>
            </form>

            {/* EL MAPA */}
            <div className="h-64 w-full rounded-xl overflow-hidden border-2 border-gray-300 shadow-sm relative z-0">
                <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom={true} className="h-full w-full">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                    <MapUpdater position={position} />
                </MapContainer>
            </div>

        </div>
    );
}

export default MapSelector;