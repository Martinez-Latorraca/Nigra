import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Arreglo técnico de los íconos (Standard Leaflet)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// 1. Detector de clics
function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });
    return position === null ? null : <Marker position={position}></Marker>;
}

// 2. Animación de cámara
function MapUpdater({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 15, {
                duration: 1.5, // Animación suave típica de Apple
            });
        }
    }, [position, map]);
    return null;
}

function MapSelector({ position, setPosition }) {
    // Centro por defecto (Montevideo)
    const defaultCenter = [-34.9011, -56.1645];

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Contenedor del Mapa con diseño inmersivo */}
            <div className="relative h-72 w-full rounded-[32px] overflow-hidden border border-gray-100 shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] bg-gray-50 z-0">

                <MapContainer
                    center={defaultCenter}
                    zoom={13}
                    scrollWheelZoom={true}
                    className="h-full w-full grayscale-[0.2] contrast-[0.9]" // Sutil filtro para que no brille tanto el mapa
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                    <MapUpdater position={position} />
                </MapContainer>

                {/* Overlay de estado sutil dentro del mapa */}
                {!position && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
                        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-white/20">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Toca para marcar punto
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Indicador de coordenadas minimalista */}
            {position && (
                <div className="flex justify-center animate-fade-in pb-2">
                    <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full border border-gray-200">
                        <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></div>
                        <span className="text-[12px] font-bold text-gray-400  tracking-tighter">
                            Lat: {position.lat.toFixed(4)} / Lng: {position.lng.toFixed(4)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MapSelector;