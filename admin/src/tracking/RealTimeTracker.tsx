// RealTimeTracker.tsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { trackingAPI } from '../services/api';
import socket from '../socket';
import { Navigation, MapPin,ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
}

interface BookingLocation {
  bookingId: string;
  customerLocation: Location;
  mechanicLocation?: Location;
  serviceLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: string;
  estimatedArrival?: string;
}

interface RealTimeTrackerProps {
  bookingId?: string;
  isActive?: boolean;
  onLocationUpdate?: (location: Location) => void;
}

// Custom markers
const createCustomIcon = (role: string, isOnline: boolean = true) => {
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
        width: 30px;
        height: 30px;
        background: ${colors[role as keyof typeof colors] || '#6B7280'};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        opacity: ${isOnline ? 1 : 0.6};
      ">
        <span style="color: white; font-size: 12px; font-weight: bold;">
          ${role.charAt(0).toUpperCase()}
        </span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Map updater component
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
};

const RealTimeTracker: React.FC<RealTimeTrackerProps> = ({
  bookingId,
  isActive = true,
  onLocationUpdate
}) => {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [bookingLocation, setBookingLocation] = useState<BookingLocation | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<Location[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(10);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date(),
          userId: user?._id || '',
          userName: user?.name || '',
          userRole: user?.role || ''
        };

        setCurrentLocation(location);
        updateLocationOnServer(location);
        
        if (onLocationUpdate) {
          onLocationUpdate(location);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Failed to get current location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, [user, onLocationUpdate]);

  const updateLocationOnServer = async (location: Location) => {
    try {
      await trackingAPI.updateLocation(location.latitude, location.longitude, bookingId);
      
      // Emit location update via socket
      socket.emit('locationUpdate', {
        bookingId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          userId: location.userId,
          userRole: location.userRole
        }
      });
    } catch (error) {
      console.error('Error updating location on server:', error);
    }
  };

  const startTracking = useCallback(async () => {
    if (!bookingId) return;

    try {
      await trackingAPI.startTracking(bookingId);
      setIsTracking(true);
      
      // Get initial location
      getCurrentLocation();
      
      // Set up periodic location updates (every 30 seconds)
      locationIntervalRef.current = setInterval(() => {
        getCurrentLocation();
      }, 30000);
      
      toast.success('Location tracking started');
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast.error('Failed to start tracking');
    }
  }, [bookingId, getCurrentLocation]);

  const stopTracking = useCallback(async () => {
    if (!bookingId) return;

    try {
      await trackingAPI.stopTracking(bookingId);
      setIsTracking(false);
      
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      
      toast.success('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping tracking:', error);
      toast.error('Failed to stop tracking');
    }
  }, [bookingId]);

  const calculateETA = useCallback((from: Location, to: Location) => {
    const R = 6371; // Earth's radius in km
    const dLat = (to.latitude - from.latitude) * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    // Assume average speed of 30 km/h for mechanics
    const timeInHours = distance / 30;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    if (timeInMinutes < 60) {
      return `${timeInMinutes} minutes`;
    } else {
      const hours = Math.floor(timeInMinutes / 60);
      const minutes = timeInMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }, []);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!bookingId || !isActive) return;

    const handleLocationUpdate = (data: any) => {
      if (data.bookingId === bookingId) {
        // Update booking location data
        fetchBookingLocation();
      }
    };

    const handleBookingUpdate = (data: any) => {
      if (data.bookingId === bookingId) {
        fetchBookingLocation();
      }
    };

    socket.on('locationUpdated', handleLocationUpdate);
    socket.on('bookingUpdated', handleBookingUpdate);

    return () => {
      socket.off('locationUpdated', handleLocationUpdate);
      socket.off('bookingUpdated', handleBookingUpdate);
    };
  }, [bookingId, isActive]);

  // Auto-start tracking for mechanics and customers
  useEffect(() => {
    if (bookingId && isActive && (user?.role === 'mechanic' || user?.role === 'customer')) {
      startTracking();
    }

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [bookingId, isActive, user?.role, startTracking]);

  // Update map center based on locations
  useEffect(() => {
    if (currentLocation && bookingLocation) {
      const centerLat = (currentLocation.latitude + bookingLocation.serviceLocation.latitude) / 2;
      const centerLng = (currentLocation.longitude + bookingLocation.serviceLocation.longitude) / 2;
      setMapCenter([centerLat, centerLng]);
      setMapZoom(12);
    } else if (currentLocation) {
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
      setMapZoom(14);
    } else if (bookingLocation) {
      setMapCenter([bookingLocation.serviceLocation.latitude, bookingLocation.serviceLocation.longitude]);
      setMapZoom(12);
    }
  }, [currentLocation, bookingLocation]);

  // Get tracking history
  useEffect(() => {
    if (!bookingId) return;

    const fetchTrackingHistory = async () => {
      try {
        const history = await trackingAPI.getTrackingHistory(bookingId);
        setTrackingHistory(history as unknown as Location[]);
      } catch (error) {
        console.error('Error fetching tracking history:', error);
      }
    };

    fetchTrackingHistory();
  }, [bookingId]);

  // Fetch booking location data
  const fetchBookingLocation = async () => {
    if (!bookingId) return;

    try {
      const data = await trackingAPI.getBookingLocation(bookingId);
      setBookingLocation(data as unknown as BookingLocation);
      
      // Calculate ETA if we have both mechanic and customer locations
      if (data.mechanicLocation && data.customerLocation) {
        const eta = calculateETA(data.mechanicLocation as unknown as Location, data.customerLocation as unknown as Location);
        setEstimatedArrival(eta);
      }
    } catch (error) {
      console.error('Error fetching booking location:', error);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchBookingLocation();
    }
  }, [bookingId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);

  const generatePolyline = () => {
    if (trackingHistory.length < 2) return [];
    
    return trackingHistory.map(location => [location.latitude, location.longitude] as [number, number]);
  };

  if (!bookingId) return null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
      isExpanded ? 'w-full h-96' : 'w-full'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-2">
          <Navigation size={20} className="text-blue-500" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">
            Live Tracking
          </h3>
          {estimatedArrival && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              ETA: {estimatedArrival}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Map Container */}
          <div className={`relative ${isExpanded ? 'h-80' : 'h-64'} w-full`}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
              style={{ minHeight: isExpanded ? '320px' : '256px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapUpdater center={mapCenter} zoom={mapZoom} />

              {/* Current Location Marker */}
              {currentLocation && (
                <Marker
                  position={[currentLocation.latitude, currentLocation.longitude]}
                  icon={createCustomIcon(currentLocation.userRole, true)}
                >
                  <Popup>
                    <div className="text-sm">
                      <p><strong>You ({currentLocation.userRole})</strong></p>
                      <p>Lat: {currentLocation.latitude.toFixed(6)}</p>
                      <p>Lng: {currentLocation.longitude.toFixed(6)}</p>
                      <p>Time: {currentLocation.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Service Location Marker */}
              {bookingLocation && (
                <Marker
                  position={[bookingLocation.serviceLocation.latitude, bookingLocation.serviceLocation.longitude]}
                  icon={createCustomIcon('garage', true)}
                >
                  <Popup>
                    <div className="text-sm">
                      <p><strong>Service Location</strong></p>
                      <p>{bookingLocation.serviceLocation.address}</p>
                      <p>Lat: {bookingLocation.serviceLocation.latitude.toFixed(6)}</p>
                      <p>Lng: {bookingLocation.serviceLocation.longitude.toFixed(6)}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Customer Location Marker */}
              {bookingLocation?.customerLocation && (
                <Marker
                  position={[bookingLocation.customerLocation.latitude, bookingLocation.customerLocation.longitude]}
                  icon={createCustomIcon('customer', true)}
                >
                  <Popup>
                    <div className="text-sm">
                      <p><strong>Customer</strong></p>
                      <p>{bookingLocation.customerLocation.userName}</p>
                      <p>Lat: {bookingLocation.customerLocation.latitude.toFixed(6)}</p>
                      <p>Lng: {bookingLocation.customerLocation.longitude.toFixed(6)}</p>
                      <p>Time: {bookingLocation.customerLocation.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Mechanic Location Marker */}
              {bookingLocation?.mechanicLocation && (
                <Marker
                  position={[bookingLocation.mechanicLocation.latitude, bookingLocation.mechanicLocation.longitude]}
                  icon={createCustomIcon('mechanic', true)}
                >
                  <Popup>
                    <div className="text-sm">
                      <p><strong>Mechanic</strong></p>
                      <p>{bookingLocation.mechanicLocation.userName}</p>
                      <p>Lat: {bookingLocation.mechanicLocation.latitude.toFixed(6)}</p>
                      <p>Lng: {bookingLocation.mechanicLocation.longitude.toFixed(6)}</p>
                      <p>Time: {bookingLocation.mechanicLocation.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Tracking History Polyline */}
              {trackingHistory.length > 1 && (
                <Polyline
                  positions={generatePolyline()}
                  color="#3B82F6"
                  weight={3}
                  opacity={0.7}
                />
              )}
            </MapContainer>
          </div>

          {/* Controls */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={getCurrentLocation}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                <MapPin size={16} />
                <span>Get Location</span>
              </button>
              
              {user?.role === 'mechanic' && (
                <button
                  onClick={isTracking ? stopTracking : startTracking}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm ${
                    isTracking
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  <Navigation size={16} />
                  <span>{isTracking ? 'Stop Tracking' : 'Start Tracking'}</span>
                </button>
              )}
            </div>

            {/* Status Bar */}
            <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>Status: {isTracking ? 'Active' : 'Inactive'}</span>
                {currentLocation && (
                  <span>
                    Last Update: {currentLocation.timestamp.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>You</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Mechanic</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Service</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RealTimeTracker;