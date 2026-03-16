import React, { useEffect } from 'react';
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

// 2. Sub-componente para hacer que la cámara del mapa "vuele" a la nueva dirección
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

    return (
        <div className="flex flex-col gap-3">
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