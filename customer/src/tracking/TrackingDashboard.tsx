import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


import { Navigation, Users, Clock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ActiveTracking {
  bookingId: string;
  customerLocation?: {
    latitude: number;
    longitude: number;
    userName: string;
    timestamp: Date;
  };
  mechanicLocation?: {
    latitude: number;
    longitude: number;
    userName: string;
    timestamp: Date;
  };
  serviceLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: string;
  estimatedArrival?: string;
}

const TrackingDashboard: React.FC = () => {
 
  const [activeTrackings, setActiveTrackings] = useState<ActiveTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTracking, setSelectedTracking] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(10);

  // Custom markers
  const createCustomIcon = (role: string) => {
    const colors = {
      customer: '#3B82F6',
      mechanic: '#10B981',
      garage: '#F59E0B',
      admin: '#EF4444'
    };

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 25px;
          height: 25px;
          background: ${colors[role as keyof typeof colors] || '#6B7280'};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <span style="color: white; font-size: 10px; font-weight: bold;">
            ${role.charAt(0).toUpperCase()}
          </span>
        </div>
      `,
      iconSize: [25, 25],
      iconAnchor: [12, 12]
    });
  };

  useEffect(() => {
    fetchActiveTrackings();
    const interval = setInterval(fetchActiveTrackings, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchActiveTrackings = async () => {
    try {
      setLoading(true);
      // This would need to be implemented in the backend
      // For now, we'll simulate with empty array
      setActiveTrackings([]);
    } catch (error) {
      console.error('Error fetching active trackings:', error);
      toast.error('Failed to fetch tracking data');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackingSelect = (bookingId: string) => {
    setSelectedTracking(selectedTracking === bookingId ? null : bookingId);
    
    // Center map on selected tracking
    const tracking = activeTrackings.find(t => t.bookingId === bookingId);
    if (tracking) {
      if (tracking.mechanicLocation) {
        setMapCenter([tracking.mechanicLocation.latitude, tracking.mechanicLocation.longitude]);
        setMapZoom(14);
      } else if (tracking.customerLocation) {
        setMapCenter([tracking.customerLocation.latitude, tracking.customerLocation.longitude]);
        setMapZoom(14);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Navigation className="text-blue-500" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Tracking Dashboard
            </h3>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Users size={16} />
            <span>{activeTrackings.length} Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-96">
        {/* Tracking List */}
        <div className="lg:col-span-1 p-4 border-r dark:border-gray-700 overflow-y-auto">
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Active Bookings</h4>
          
          {activeTrackings.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No active tracking sessions
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTrackings.map((tracking) => (
                <div
                  key={tracking.bookingId}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTracking === tracking.bookingId
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleTrackingSelect(tracking.bookingId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Booking #{tracking.bookingId.slice(-6)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tracking.status === 'on-way' ? 'bg-blue-100 text-blue-800' :
                      tracking.status === 'arrived' ? 'bg-green-100 text-green-800' :
                      tracking.status === 'working' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {tracking.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {tracking.customerLocation && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Customer: {tracking.customerLocation.userName}</span>
                      </div>
                    )}
                    {tracking.mechanicLocation && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Mechanic: {tracking.mechanicLocation.userName}</span>
                      </div>
                    )}
                    {tracking.estimatedArrival && (
                      <div className="flex items-center space-x-1">
                        <Clock size={12} />
                        <span>ETA: {tracking.estimatedArrival}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-2 h-full">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Service Location Markers */}
            {activeTrackings.map((tracking) => (
              <Marker
                key={`service-${tracking.bookingId}`}
                position={[tracking.serviceLocation.latitude, tracking.serviceLocation.longitude]}
                icon={L.divIcon({
                  className: 'service-marker',
                  html: `
                    <div style="
                      width: 20px;
                      height: 20px;
                      background: #EF4444;
                      border: 3px solid white;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">
                      <span style="color: white; font-size: 8px;">📍</span>
                    </div>
                  `,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                })}
              >
                <Popup>
                  <div className="text-center">
                    <h4 className="font-semibold">Service Location</h4>
                    <p className="text-sm text-gray-600">{tracking.serviceLocation.address}</p>
                    <p className="text-xs text-gray-500">Booking #{tracking.bookingId.slice(-6)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Customer Location Markers */}
            {activeTrackings.map((tracking) => 
              tracking.customerLocation && (
                <Marker
                  key={`customer-${tracking.bookingId}`}
                  position={[tracking.customerLocation.latitude, tracking.customerLocation.longitude]}
                  icon={createCustomIcon('customer')}
                >
                  <Popup>
                    <div className="text-center">
                      <h4 className="font-semibold">{tracking.customerLocation.userName}</h4>
                      <p className="text-sm text-gray-600">Customer</p>
                      <p className="text-xs text-gray-500">
                        {tracking.customerLocation.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )
            )}

            {/* Mechanic Location Markers */}
            {activeTrackings.map((tracking) => 
              tracking.mechanicLocation && (
                <Marker
                  key={`mechanic-${tracking.bookingId}`}
                  position={[tracking.mechanicLocation.latitude, tracking.mechanicLocation.longitude]}
                  icon={createCustomIcon('mechanic')}
                >
                  <Popup>
                    <div className="text-center">
                      <h4 className="font-semibold">{tracking.mechanicLocation.userName}</h4>
                      <p className="text-sm text-gray-600">Mechanic</p>
                      <p className="text-xs text-gray-500">
                        {tracking.mechanicLocation.timestamp.toLocaleTimeString()}
                      </p>
                      {tracking.estimatedArrival && (
                        <p className="text-xs text-blue-600">ETA: {tracking.estimatedArrival}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            )}

            {/* Polylines for tracking paths */}
            {activeTrackings.map((tracking) => {
              const points: [number, number][] = [];
              
              if (tracking.customerLocation) {
                points.push([tracking.customerLocation.latitude, tracking.customerLocation.longitude]);
              }
              if (tracking.mechanicLocation) {
                points.push([tracking.mechanicLocation.latitude, tracking.mechanicLocation.longitude]);
              }
              points.push([tracking.serviceLocation.latitude, tracking.serviceLocation.longitude]);
              
              if (points.length >= 2) {
                return (
                  <Polyline
                    key={`polyline-${tracking.bookingId}`}
                    positions={points}
                    color="#3B82F6"
                    weight={2}
                    opacity={0.7}
                  />
                );
              }
              return null;
            })}
          </MapContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">Customer</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">Mechanic</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-300">Service Location</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingDashboard;

