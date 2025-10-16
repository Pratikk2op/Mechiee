import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  Home, 
  MapPin, 
  Wrench, 
  Clock, 
  CheckCircle, 
  Navigation,
  Map,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAddressFromCoordinates } from '../util/tracker';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Define interfaces for TypeScript
interface Location {
  lat: number | null;
  lng: number | null;
}

interface Booking {
  _id: string;
  customer?: { name: string };
  name?: string;
  serviceId?: { name: string };
  serviceType?: string;
  brand?: string;
  model?: string;
  bikeNumber?: string;
  scheduledDate?: string;
  status: string;
  lat?: number;
  lon?: number;
  address?: string;
  updatedAt?: string;
}

// Map component for booking location
const BookingLocationMap: React.FC<{ booking: Booking }> = ({ booking }) => {
  const [location, setLocation] = useState<Location>({ lat: null, lng: null });
  const map = useMap();

  useEffect(() => {
    if (booking?.lat && booking?.lon) {
      map.setView([booking.lat, booking.lon], 15);
    }
  }, [booking, map]);

  useEffect(() => {
    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          toast.error(err.message);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  if (!booking?.lat || !booking?.lon) {
    return null;
  }

  return (
    <>
      <Marker 
        position={[booking.lat, booking.lon]} 
        icon={createCustomIcon('#ef4444')}
      >
        <Popup>
          <div className="p-2">
            <h3 className="font-semibold text-sm">Customer Location</h3>
            <p className="text-xs text-gray-600">{booking.address || 'Address not available'}</p>
            <p className="text-xs text-gray-600">
              {booking.customer?.name || booking.name || 'Unknown Customer'}
            </p>
          </div>
        </Popup>
      </Marker>
      {location.lat && location.lng && (
        <Marker 
          position={[location.lat, location.lng]} 
          icon={createCustomIcon('#000000')}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-sm">Your Location</h3>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
};

const BASE_URI = import.meta.env.VITE_API_URL;

const MechanicDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings'>('dashboard');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [completedJobs, setCompletedJobs] = useState<Booking[]>([]);
  const navigate = useNavigate();
  const [trackingBookings, setTrackingBookings] = useState<Set<string>>(new Set());
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const locationWatchId = useRef<number | null>(null);

  // Fetch addresses for bookings
  const fetchAddresses = async (bookingsList: Booking[]): Promise<Booking[]> => {
    return Promise.all(
      bookingsList.map(async (booking) => {
        if (!booking.address && booking.lat && booking.lon) {
          try {
            const address = await getAddressFromCoordinates(booking.lat.toString(), booking.lon.toString());
            return { ...booking, address };
          } catch (error) {
            console.error('Failed to fetch address:', error);
            return { ...booking, address: 'Address not available' };
          }
        }
        return { ...booking, address: booking.address || 'Address not available' };
      })
    );
  };

  // Fetch bookings data
  const fetchData = async () => {
    try {
      const response = await axios.get(`${BASE_URI}/api/bookings/mechanic`, {
        withCredentials: true,
        timeout: 10000,
      });

      const bookingsData: Booking[] = response.data.bookings || [];
      const bookingsWithAddresses = await fetchAddresses(bookingsData);
      setBookings(bookingsWithAddresses);
      setPendingBookings(bookingsWithAddresses.filter((b) => b.status === 'assigned'));
      setCompletedJobs(bookingsWithAddresses.filter((b) => b.status === 'completed'));
    } catch (error) {
      console.error('Failed to load bookings:', error);
      toast.error('Failed to load bookings. Please try again.');
    }
  };

  // Handle status update
  const handleStatus = async (id: string) => {
    try {
      const response = await axios.put(
        `${BASE_URI}/api/bookings/status`,
        { id },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      const data = response.data;

      if (data?.success) {
        toast.success(data.message || 'Status updated successfully');
        await fetchData();
      } else {
        toast.error(data?.message || 'Update failed!');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Something went wrong!');
    }
  };

  // Update location function
  const updateLocation = async (position: GeolocationPosition) => {
    if (trackingBookings.size === 0) {
      console.log('No bookings to track, skipping location update');
      return;
    }

    const { latitude, longitude } = position.coords;
    try {
      const promises = Array.from(trackingBookings).map(async (bookingId) => {
        if (!bookingId || typeof bookingId !== 'string') {
          console.warn(`Invalid booking ID: ${bookingId}`);
          return;
        }
        try {
          console.log(`Updating location for booking: ${bookingId}`);
          const response = await axios.put(
            `${BASE_URI}/api/tracking/update-tracking`,
            { latitude, longitude, bookingId },
            { withCredentials: true }
          );
          console.log(`Location updated successfully for booking ${bookingId}:`, response.data);
        } catch (error) {
          console.error(`Failed to update location for booking ${bookingId}:`, error);
          toast.error(`Failed to update location for booking ${bookingId}`);
        }
      });
      await Promise.all(promises);
    } catch (error) {
      console.error('Unexpected error during location updates:', error);
      toast.error('An unexpected error occurred while updating locations');
    }
  };

  // Start/stop tracking for a specific booking
  const toggleTracking = (bookingId: string) => {
    if (!bookingId || typeof bookingId !== 'string') {
      console.warn('Invalid booking ID provided to toggleTracking:', bookingId);
      toast.error('Invalid booking ID');
      return;
    }

    const isCurrentlyTracking = trackingBookings.has(bookingId);
    const newTracking = new Set(trackingBookings);

    if (isCurrentlyTracking) {
      newTracking.delete(bookingId);
      toast.success('Tracking stopped for this booking');
    } else {
      newTracking.add(bookingId);
      toast.success('Tracking started for this booking');
    }

    setTrackingBookings(newTracking);

    if (newTracking.size === 0) {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
        console.log('Cleared tracking interval');
      }
      if (locationWatchId.current) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
        console.log('Geolocation watch cleared');
      }
    } else if (!locationWatchId.current && 'geolocation' in navigator) {
      console.log('Starting geolocation watch with high accuracy');
      locationWatchId.current = navigator.geolocation.watchPosition(
        updateLocation,
        (error) => {
          console.error('Geolocation error:', error);
          let errorMessage = 'Location access denied or unavailable';
          if (error.code === error.TIMEOUT) {
            errorMessage = 'Location request timed out. Please ensure GPS is enabled or try moving to an open area.';
          } else if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location access denied. Please enable location permissions in your browser.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'Location data unavailable. Please check your device settings or GPS signal.';
          }
          toast.error(errorMessage);
          setTrackingBookings(new Set());
          if (locationWatchId.current) {
            navigator.geolocation.clearWatch(locationWatchId.current);
            locationWatchId.current = null;
            console.log('Geolocation watch cleared due to error');
          }
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 120000 }
      );
      console.log('Geolocation watch started with ID:', locationWatchId.current);
    } else if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      setTrackingBookings(new Set());
    }
  };

  // Load bookings on mount and when activeTab changes
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderDashboardContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {completedJobs.filter(job => {
                  const today = new Date().toDateString();
                  return new Date(job.updatedAt || Date.now()).toDateString() === today;
                }).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pendingBookings.length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </motion.div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Completed Bookings</h3>
        <div className="space-y-3">
          {bookings.length > 0 ? (
            completedJobs.map((booking) => (
              <div
                key={booking._id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                  <div className={`w-3 h-3 rounded-full ${
                    booking.status === 'completed' ? 'bg-green-500' :
                    booking.status === 'working' ? 'bg-blue-500' :
                    booking.status === 'pending' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {booking.customer?.name || booking.name || 'Unknown Customer'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {booking.serviceId?.name || booking.serviceType || 'Unknown Service'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-1">
                      {booking.address || 'Address not available'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{booking.status}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No recent bookings available.</p>
          )}
        </div>
      </div>

      {/* Leaflet Map Card */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Customer Locations</h3>
        <div className="h-64 rounded-lg overflow-hidden">
          {bookings.some(b => b.lat && b.lon) ? (
            <MapContainer
              center={bookings.find(b => b.lat && b.lon)?.lat && bookings.find(b => b.lat && b.lon)?.lon 
                ? [bookings.find(b => b.lat && b.lon)!.lat!, bookings.find(b => b.lat && b.lon)!.lon!] 
                : [20.5937, 78.9629]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {bookings.filter(b => b.lat && b.lon).map((booking) => (
                <Marker 
                  key={booking._id}
                  position={[booking.lat!, booking.lon!]} 
                  icon={createCustomIcon('#3b82f6')}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-sm">
                        {booking.customer?.name || booking.name || 'Unknown Customer'}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {booking.serviceId?.name || booking.serviceType || 'Unknown Service'}
                      </p>
                      <p className="text-xs text-gray-600 capitalize">{booking.status}</p>
                      <p className="text-xs text-gray-600 mt-1">{booking.address || 'Address not available'}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <MapPin size={48} className="mx-auto mb-2 opacity-50" />
                <p>No location data available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderBookingsContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Bookings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {pendingBookings.length > 0 ? (
          pendingBookings.map((booking) => (
            <motion.div
              key={booking._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {booking.customer?.name || booking.name || 'Unknown Customer'}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'working' ? 'bg-blue-100 text-blue-800' :
                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Service:</strong> {booking.serviceId?.name || booking.serviceType || 'Unknown Service'}</p>
                <p><strong>Vehicle:</strong> {booking.brand || 'Unknown'} {booking.model || ''}</p>
                <p><strong>Vehicle Details:</strong> {booking.bikeNumber || 'Unknown'}</p>
                <p><strong>Date:</strong> {new Date(booking.scheduledDate || Date.now()).toLocaleDateString()}</p>
                <p><strong>Address:</strong> {booking.address || 'Address not available'}</p>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                {booking.lat && booking.lon && (
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setMapOpen(true);
                    }}
                    className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                  >
                    <Map size={16} />
                    <span>View Map</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedBooking(booking);
                    handleStatus(booking._id);
                  }}
                  className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Mark Completed</span>
                </button>

                <button
                  onClick={() => toggleTracking(booking._id)}
                  className={`w-full sm:flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${
                    trackingBookings.has(booking._id)
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  <MapPin size={16} />
                  <span>{trackingBookings.has(booking._id) ? 'Stop Track' : 'Track'}</span>
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No bookings available.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Mechanic Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-8">
          {/* Sidebar */}
          <div className="w-full lg:w-64">
            <nav className="space-y-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Home },
                { id: 'bookings', label: 'Pending Bookings', icon: Wrench },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'dashboard' | 'bookings')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon size={20} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'dashboard' && renderDashboardContent()}
            {activeTab === 'bookings' && renderBookingsContent()}
          </div>
        </div>
      </div>

      {/* Map Component */}
      {selectedBooking && mapOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-96">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Customer Location - {selectedBooking.customer?.name || selectedBooking.name || 'Unknown Customer'}
              </h3>
              <button
                onClick={() => setMapOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="h-80">
              {selectedBooking.lat && selectedBooking.lon ? (
                <MapContainer
                  center={[selectedBooking.lat, selectedBooking.lon]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <BookingLocationMap booking={selectedBooking} />
                </MapContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <MapPin size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No location data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Toggle Button */}
      {selectedBooking && selectedBooking.lat && selectedBooking.lon && (
        <button
          onClick={() => setMapOpen(!mapOpen)}
          className="fixed bottom-4 right-4 lg:right-20 z-50 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-colors"
          title="View Map"
        >
          <Navigation size={20} />
        </button>
      )}
    </div>
  );
};

export default MechanicDashboard;