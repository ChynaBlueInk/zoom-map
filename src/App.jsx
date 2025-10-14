import {useState} from "react";
import {MapContainer, TileLayer, Marker, useMapEvents} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons in Vite
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker1x from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker1x,
  shadowUrl: markerShadow
});

function LocationPicker({onSelect}) {
  useMapEvents({
    click: (e)=>{
      onSelect(e.latlng);
    }
  });
  return null;
}

export default function App() {
  const [markers, setMarkers]=useState([]);

  const handleSelect=(latlng)=>{
    setMarkers((prev)=>[...prev, latlng]);
    // 🔜 later: push to Firebase for realtime
  };

  return (
    <div className="wrap">
      <header className="bar">
        <strong>Click the map to drop your pin</strong>
      </header>
      <MapContainer center={[0,0]} zoom={2} className="map">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        <LocationPicker onSelect={handleSelect}/>
        {markers.map((pos, i)=><Marker key={i} position={pos}/>)}
      </MapContainer>
    </div>
  );
}
