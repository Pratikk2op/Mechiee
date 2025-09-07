import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ Green icon for current location (default Leaflet icon)
const greenIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ✅ Red icon for selected location (custom online icon)
const redIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png", // Any custom red marker icon
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

type Props = {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
};

const LocationSelector: React.FC<Props> = ({ onLocationSelect }) => {
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCurrentPosition(coords);
      },
      () => alert("Unable to access location")
    );
  }, []);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const address = data.display_name || `${lat}, ${lng}`;
      setSelectedAddress(address);
      onLocationSelect(lat, lng, address);
    } catch (error) {
      console.error("Failed to fetch address:", error);
    }
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const coords: [number, number] = [e.latlng.lat, e.latlng.lng];
        setSelectedPosition(coords);
        fetchAddress(coords[0], coords[1]);
      },
    });
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="h-[400px] rounded-xl overflow-hidden">
        {currentPosition && (
          <MapContainer
            center={currentPosition}
            zoom={15}
            scrollWheelZoom
            className="h-full w-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* ✅ Green icon for current position */}
            <Marker position={currentPosition} icon={greenIcon} />
            {/* ✅ Red icon for selected position */}
            {selectedPosition && <Marker position={selectedPosition} icon={redIcon} />}
            <LocationMarker />
          </MapContainer>
        )}
      </div>

      {selectedAddress && (
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm dark:text-white">
          <strong>Selected Address:</strong> {selectedAddress}
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
