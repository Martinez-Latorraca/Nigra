import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CARTO_LIGHT_TILES } from '../utils/links';

// Pin de marca (handoff: estilo de mapa actual, con el pin de Mimo).
const PIN_ICON = L.icon({ iconUrl: '/landing/pin.svg', iconSize: [36, 44], iconAnchor: [18, 44] });

// Centro por defecto: Montevideo.
const DEFAULT_CENTER = [-34.9011, -56.1645];

function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });
    return position ? <Marker position={position} icon={PIN_ICON} /> : null;
}

function MapUpdater({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.flyTo(position, 15, { duration: 1.2 });
    }, [position, map]);
    return null;
}

// Mapa para marcar un punto con un clic. Lo usan el reporte y el perfil de vet.
export default function MapSelector({ position, setPosition, height = 'h-[220px]' }) {
    return (
        <div className={`relative ${height} w-full rounded-3xl overflow-hidden bg-mimo-muted z-0`}>
            <MapContainer center={DEFAULT_CENTER} zoom={13} scrollWheelZoom className="h-full w-full">
                <TileLayer url={CARTO_LIGHT_TILES} attribution="&copy; OpenStreetMap &copy; CARTO" />
                <LocationMarker position={position} setPosition={setPosition} />
                <MapUpdater position={position} />
            </MapContainer>
            {!position && (
                <span className="absolute top-3.5 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none px-3.5 py-2 rounded-full bg-white text-[13px] font-bold text-mimo-noche shadow-card whitespace-nowrap">
                    Tocá el mapa para marcar el punto
                </span>
            )}
        </div>
    );
}
