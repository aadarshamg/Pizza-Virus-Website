import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker icon paths break under bundlers - use a simple styled pin instead.
const pinIcon = L.divIcon({
    className: '',
    html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#22973a;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 4px 10px rgba(0,0,0,.3)"></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
});

function ClickToPin({ onPick }) {
    useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
    return null;
}

function Recenter({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.setView([position.lat, position.lng], Math.max(map.getZoom(), 16));
    }, [position, map]);
    return null;
}

// Tap the map to drop a pin. `zone` (optional) is the store's delivery polygon [[lat,lng],...].
export default function MapPicker({ position, onChange, center, zone }) {
    const start = position || center || { lat: 31.2536, lng: 75.7033 }; // Phagwara / LPU area
    return (
        <MapContainer center={[start.lat, start.lng]} zoom={15} className="h-64 w-full rounded-2xl z-0" scrollWheelZoom={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {zone?.length >= 3 && <Polygon positions={zone} pathOptions={{ color: '#22973a', weight: 2, fillOpacity: 0.08 }} />}
            {position && <Marker position={[position.lat, position.lng]} icon={pinIcon} />}
            <ClickToPin onPick={onChange} />
            <Recenter position={position} />
        </MapContainer>
    );
}
