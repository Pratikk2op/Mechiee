import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../socket';
import { 
  MapPin, 
  User, 
  Car, 
  Clock, 
  Phone, 
  MessageCircle,
  ChevronUp,
  ChevronDown,
  Navigation,
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';

// Fix for default markers in React-Leaflet
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
  userRole: string;
  userName: string;
}

interface Booking {
  _id: string;
  customer: {
    _id: string;
    name: string;
    phone: string;
  };
  mechanic?: {
    _id: string;
    name: string;
    phone: string;
  };
  garage?: {
    _id: string;
    name: string;
  };
  status: string;
  address: string;
  scheduledDate: Date;
  customerLocation?: Location;
  mechanicLocation?: Location;
}

interface LiveTrackingMapProps {
  bookingId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Custom markers with better icons
const createCustomIcon = (color: string, icon: string, label: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <div style="
          background-color: ${color};
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          margin-bottom: 5px;
        ">
          ${icon}
        </div>
        <div style="
          background-color: rgba(0,0,0,0.8);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
        ">
          ${label}
        </div>
      </div>
    `,
    iconSize: [50, 70],
    iconAnchor: [25, 50],
    popupAnchor: [0, -70],
  });
};

const customerIcon = createCustomIcon('#3B82F6', '👤', 'Customer');
const mechanicIcon = createCustomIcon('#10B981', '🔧', 'Mechanic');
const garageIcon = createCustomIcon('#F59E0B', '🏢', 'Garage');
const adminIcon = createCustomIcon('#8B5CF6', '👨‍💼', 'Admin');

// Map updater component
const MapUpdater: React.FC<{ 
  customerLocation?: Location; 
  mechanicLocation?: Location;
  centerOnCustomer?: boolean;
}> = ({ customerLocation, mechanicLocation, centerOnCustomer }) => {
  const map = useMap();

  useEffect(() => {
    if (customerLocation && centerOnCustomer) {
      map.setView([customerLocation.latitude, customerLocation.longitude], 15);
    }
  }, [customerLocation, mechanicLocation, centerOnCustomer, map]);

  return null;
};

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({ 
  bookingId, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [customerLocation, setCustomerLocation] = useState<Location | null>(null);
  const [mechanicLocation, setMechanicLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [centerOnCustomer, setCenterOnCustomer] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(13);
  const locationUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch booking details
  const fetchBookingDetails = useCallback(async () => {
    if (!bookingId) return;
    
    setLoading(true);
    try {
      // Mock booking data - replace with actual API call
      const mockBooking: Booking = {
        _id: bookingId,
        customer: {
          _id: 'customer_1',
          name: 'John Doe',
          phone: '+91 9876543210'
        },
        mechanic: {
          _id: 'mechanic_1',
          name: 'Mike Smith',
          phone: '+91 9876543211'
        },
        garage: {
          _id: 'garage_1',
          name: 'ABC Garage'
        },
        status: 'assigned',
        address: '123 Main Street, City, State',
        scheduledDate: new Date(),
        customerLocation: {
          latitude: 19.0760,
          longitude: 72.8777,
          timestamp: new Date(),
          userId: 'customer_1',
          userRole: 'customer',
          userName: 'John Doe'
        },
        mechanicLocation: {
          latitude: 19.0760,
          longitude: 72.8777,
          timestamp: new Date(),
          userId: 'mechanic_1',
          userRole: 'mechanic',
          userName: 'Mike Smith'
        }
      };

      setBooking(mockBooking);
      setCustomerLocation(mockBooking.customerLocation ?? null);
      setMechanicLocation(mockBooking.mechanicLocation ?? null);
      
      // Set initial map center
      if (mockBooking.customerLocation) {
        setMapCenter([mockBooking.customerLocation.latitude, mockBooking.customerLocation.longitude]);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Initialize location tracking
  useEffect(() => {
    if (!bookingId || !isConnected) return;

    fetchBookingDetails();

    // Join location tracking room
    socket.emit('joinLocationRoom', bookingId);

    // Listen for location updates
    const handleLocationUpdate = (data: {
      bookingId: string;
      location: Location;
      userId: string;
      userRole: string;
    }) => {
      if (data.bookingId === bookingId) {
        if (data.userRole === 'customer') {
          setCustomerLocation(data.location);
          if (centerOnCustomer) {
            setMapCenter([data.location.latitude, data.location.longitude]);
          }
        } else if (data.userRole === 'mechanic') {
          setMechanicLocation(data.location);
        }
        
        toast.success(`${data.location.userName} location updated`);
      }
    };

    socket.on('locationUpdated', handleLocationUpdate);

    return () => {
      socket.off('locationUpdated', handleLocationUpdate);
      socket.emit('leaveLocationRoom', bookingId);
    };
  }, [bookingId, isConnected, socket, centerOnCustomer, fetchBookingDetails]);

  // Start location tracking for current user
  useEffect(() => {
    if (!user || !bookingId || !isConnected) return;

    const startLocationTracking = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location: Location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: new Date(),
              userId: user.id,
              userRole: user.role,
              userName: user.name
            };

            // Emit location update
            socket.emit('locationUpdate', {
              bookingId,
              location,
              userId: user.id,
              userRole: user.role
            });

            // Update local state
            if (user.role === 'customer') {
              setCustomerLocation(location);
            } else if (user.role === 'mechanic') {
              setMechanicLocation(location);
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            // Use mock location for demo purposes
            const mockLocation: Location = {
              latitude: 19.0760 + (Math.random() - 0.5) * 0.01, // Small random offset
              longitude: 72.8777 + (Math.random() - 0.5) * 0.01,
              timestamp: new Date(),
              userId: user.id,
              userRole: user.role,
              userName: user.name
            };

            // Emit mock location update
            socket.emit('locationUpdate', {
              bookingId,
              location: mockLocation,
              userId: user.id,
              userRole: user.role
            });

            // Update local state
            if (user.role === 'customer') {
              setCustomerLocation(mockLocation);
            } else if (user.role === 'mechanic') {
              setMechanicLocation(mockLocation);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        );
      }
    };

    // Initial location
    startLocationTracking();

    // Set up periodic location updates (more frequent for demo)
    locationUpdateInterval.current = setInterval(startLocationTracking, 10000); // Update every 10 seconds

    return () => {
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
      }
    };
  }, [user, bookingId, isConnected, socket]);

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get ETA based on distance
  const getETA = (distance: number): string => {
    const avgSpeed = 30; // km/h
    const timeInHours = distance / avgSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);
    return `${timeInMinutes} minutes`;
  };

  const distance = customerLocation && mechanicLocation 
    ? calculateDistance(
        customerLocation.latitude, 
        customerLocation.longitude,
        mechanicLocation.latitude, 
        mechanicLocation.longitude
      )
    : 0;

  const eta = distance > 0 ? getETA(distance) : 'Calculating...';

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Navigation className="h-6 w-6" />
            <div>
              <h3 className="text-lg font-semibold">Live Tracking</h3>
              <p className="text-blue-100 text-sm">
                {booking ? `Booking #${booking._id.slice(-6)}` : 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCenterOnCustomer(!centerOnCustomer)}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              title={centerOnCustomer ? "Center on mechanic" : "Center on customer"}
            >
              <Target className="h-4 w-4" />
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              >
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Status Bar */}
          <div className="bg-gray-50 px-4 py-3 border-b">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Customer</span>
                  {customerLocation && (
                    <span className="text-xs text-green-600">● Live</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Mechanic</span>
                  {mechanicLocation && (
                    <span className="text-xs text-green-600">● Live</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                  <span className="text-xs text-green-600">Real-time</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{distance.toFixed(1)} km</div>
                  <div className="text-xs text-gray-500">Distance</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{eta}</div>
                  <div className="text-xs text-gray-500">ETA</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {customerLocation && mechanicLocation ? '🟢 Active' : '🟡 Waiting'}
                  </div>
                  <div className="text-xs text-gray-500">Status</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="relative h-96">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              <MapUpdater 
                customerLocation={customerLocation ?? undefined}
                mechanicLocation={mechanicLocation ?? undefined}
                centerOnCustomer={centerOnCustomer}
              />

              {/* Customer Marker */}
              {customerLocation && (
                <Marker
                  position={[customerLocation.latitude, customerLocation.longitude]}
                  icon={customerIcon}
                >
                  <Popup>
                    <div className="text-center p-2">
                      <div className="font-semibold text-blue-600 text-lg">👤 Customer</div>
                      <div className="font-medium">{customerLocation.userName}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        📍 {customerLocation.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        📱 {booking?.customer?.phone || 'N/A'}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Mechanic Marker */}
              {mechanicLocation && (
                <Marker
                  position={[mechanicLocation.latitude, mechanicLocation.longitude]}
                  icon={mechanicIcon}
                >
                  <Popup>
                    <div className="text-center p-2">
                      <div className="font-semibold text-green-600 text-lg">🔧 Mechanic</div>
                      <div className="font-medium">{mechanicLocation.userName}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        📍 {mechanicLocation.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        📱 {booking?.mechanic?.phone || 'N/A'}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        ⏱️ ETA: {eta}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Garage Marker (if available) */}
              {booking?.garage && (
                <Marker
                  position={[19.0760, 72.8777]} // Mock garage location
                  icon={garageIcon}
                >
                  <Popup>
                    <div className="text-center p-2">
                      <div className="font-semibold text-yellow-600 text-lg">🏢 Garage</div>
                      <div className="font-medium">{booking.garage.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        📍 Service Center
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Distance Circle */}
              {customerLocation && mechanicLocation && (
                <Circle
                  center={[customerLocation.latitude, customerLocation.longitude]}
                  radius={distance * 1000} // Convert km to meters
                  pathOptions={{
                    color: 'blue',
                    fillColor: 'blue',
                    fillOpacity: 0.1,
                    weight: 2
                  }}
                />
              )}
            </MapContainer>
          </div>

          {/* User Details */}
          <div className="p-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Details */}
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center space-x-3 mb-3">
                  <User className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Customer</h4>
                </div>
                {booking?.customer && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Name:</span>
                      <span className="text-sm text-gray-600">{booking.customer.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{booking.customer.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{booking.address}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mechanic Details */}
              <div className="bg-white rounded-lg p-4 border">
                <div className="flex items-center space-x-3 mb-3">
                  <Car className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Mechanic</h4>
                </div>
                {booking?.mechanic ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Name:</span>
                      <span className="text-sm text-gray-600">{booking.mechanic.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{booking.mechanic.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">ETA: {eta}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No mechanic assigned yet</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-4">
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <MessageCircle className="h-4 w-4" />
                <span>Chat</span>
              </button>
              <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                <Phone className="h-4 w-4" />
                <span>Call</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveTrackingMap;
