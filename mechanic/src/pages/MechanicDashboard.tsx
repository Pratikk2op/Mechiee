import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 

  LogOut, 
  Home, 
  SendHorizonal, 

  MessageSquare, 
  MapPin, 
  Wrench, 
  Clock, 
  CheckCircle, 
  Navigation,
  Map,
  X
} from 'lucide-react';
import { useAuth } from './../contexts/AuthContext';
import { notificationSound } from '../util/notificationSound';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';



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

// Map component for booking location
const BookingLocationMap: React.FC<{ booking: any }> = ({ booking }) => {
  const map = useMap();
  
  useEffect(() => {
    if (booking?.lat && booking?.lon) {
      map.setView([booking.lat, booking.lon], 15);
    }
  }, [booking, map]);

  if (!booking?.lat || !booking?.lon) {
    return null;
  }

  return (
    <Marker 
      position={[booking.lat, booking.lon]} 
      icon={createCustomIcon('#ef4444')}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-sm">Customer Location</h3>
          <p className="text-xs text-gray-600">{booking.address}</p>
          <p className="text-xs text-gray-600">
            {booking.customerId?.name || 'Unknown Customer'}
          </p>
        </div>
      </Popup>
    </Marker>
  );
};

const BASE_URI = import.meta.env.VITE_API_URL;

const MechanicDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bookings, setBookings] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
 
  const [mapOpen, setMapOpen] = useState(false);
  const [, setSocket] = useState<Socket | null>(null);
  const [, setNotifications] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const navigate = useNavigate();

  // Fetch bookings data with 8-second delay
  const fetchData = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 8-second delay
      const response = await axios.get(`${BASE_URI}/api/bookings/mechanic`, {
        withCredentials: true,
        timeout: 10000,
      });
      const bookingsData = response.data.bookings || [];
      setBookings(bookingsData);
      setPendingBookings(bookingsData.filter((b: any) => b.status === 'pending'));
      setCompletedJobs(bookingsData.filter((b: any) => b.status === 'completed'));
    } catch (error) {
      console.error('Failed to load bookings:', error);
      toast.error('Failed to load bookings. Please try again.');
    }
  };

  // Load bookings on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Socket connection
  useEffect(() => {
    const newSocket = io(BASE_URI, {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      notificationSound.play();
      toast.success(notification.message);
    });

    newSocket.on('booking:assigned', (data) => {
      setNotifications(prev => [{
        id: `${data.bookingId || Date.now()}-assigned`,
        type: 'booking:assigned',
        message: data?.garageName ? `New job assigned by ${data.garageName}` : 'You have been assigned a new job!',
        timestamp: new Date(),
        payload: data,
        read: false
      }, ...prev]);
      notificationSound.play();
      toast.success('New job assigned!');
      // Update bookings without delay
      setBookings(prev => {
        const updatedBookings = [...prev, data];
        setPendingBookings(updatedBookings.filter(b => b.status === 'pending'));
        setCompletedJobs(updatedBookings.filter(b => b.status === 'completed'));
        return updatedBookings;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderDashboardContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {bookings.filter(b => ['assigned', 'on-way', 'arrived', 'working'].includes(b.status)).length}
              </p>
            </div>
            <Wrench className="h-8 w-8 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {completedJobs.filter(job => {
                  const today = new Date().toDateString();
                  return new Date(job.completedAt).toDateString() === today;
                }).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{completedJobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0)}
              </p>
            </div>
            <SendHorizonal className="h-8 w-8 text-yellow-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
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

      {/* Pending Bookings */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pending Bookings</h3>
        <div className="space-y-3">
          {pendingBookings.length > 0 ? (
            pendingBookings.map((booking) => (
              <div
                key={booking._id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {typeof booking.customerId === 'string' ? 'Unknown Customer' : booking.customerId?.name || 'Unknown Customer'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{booking.serviceId?.name || booking.serviceType || 'Unknown Service'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">₹{booking.totalAmount || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{booking.status}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No pending bookings available.</p>
          )}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Bookings</h3>
        <div className="space-y-3">
          {bookings.length > 0 ? (
            bookings.slice(0, 5).map((booking) => (
              <div
                key={booking._id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    booking.status === 'completed' ? 'bg-green-500' :
                    booking.status === 'working' ? 'bg-blue-500' :
                    booking.status === 'pending' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {typeof booking.customerId === 'string' ? 'Unknown Customer' : booking.customerId?.name || 'Unknown Customer'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{booking.serviceId?.name || booking.serviceType || 'Unknown Service'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">₹{booking.totalAmount || 0}</p>
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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Customer Locations</h3>
        <div className="h-64 rounded-lg overflow-hidden">
          {bookings.filter(b => b.lat && b.lon).length > 0 ? (
            <MapContainer
              center={[20.5937, 78.9629]} // Default to India center
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
                  position={[booking.lat, booking.lon]} 
                  icon={createCustomIcon('#3b82f6')}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-sm">
                        {typeof booking.customerId === 'string' ? 'Unknown Customer' : booking.customerId?.name || 'Unknown Customer'}
                      </h3>
                      <p className="text-xs text-gray-600">{booking.serviceId?.name || booking.serviceType || 'Unknown Service'}</p>
                      <p className="text-xs text-gray-600 capitalize">{booking.status}</p>
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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <motion.div
              key={booking._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {typeof booking.customerId === 'string' ? 'Unknown Customer' : booking.customerId?.name || 'Unknown Customer'}
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
                <p><strong>Amount:</strong> ₹{booking.totalAmount || 0}</p>
                <p><strong>Date:</strong> {new Date(booking.scheduledDate || Date.now()).toLocaleDateString()}</p>
              </div>

              <div className="mt-4 flex space-x-2">
                {booking.lat && booking.lon && (
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setMapOpen(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
                  >
                    <Map size={16} />
                    <span>View Map</span>
                  </button>
                )}
               
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No bookings available.</p>
        )}
      </div>
    </div>
  );

  const renderChatContent = () => (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Chat with Customers</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Select a booking to start chatting with the customer.
      </p>
      <div className="space-y-2">
        {bookings.filter(booking => ['assigned', 'completed'].includes(booking.status)).length > 0 ? (
          bookings.filter(booking => ['assigned', 'completed'].includes(booking.status)).map((booking) => (
            <button
              key={booking._id}
              onClick={() => {
                setSelectedBooking(booking);
            
              }}
              className="w-full p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {typeof booking.customerId === 'string' ? 'Unknown Customer' : booking.customerId?.name || 'Unknown Customer'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{booking.serviceId?.name || booking.serviceType || 'Unknown Service'}</p>
                </div>
                <MessageSquare size={20} className="text-blue-500" />
              </div>
            </button>
          ))
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No bookings available for chat.</p>
        )}
      </div>
    </div>
  );

  const renderEarningsContent = () => (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center">
      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Earnings Summary</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Total earnings: ₹{completedJobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0)}
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        Detailed earnings report coming soon!
      </p>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Home },
                { id: 'bookings', label: 'My Bookings', icon: Wrench },
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                { id: 'earnings', label: 'Earnings', icon: SendHorizonal },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
            {activeTab === 'chat' && renderChatContent()}
            {activeTab === 'earnings' && renderEarningsContent()}
          </div>
        </div>
      </div>

      {/* Chat Component */}
    
      
      {/* Chat 

      {/* Map Component */}
      {selectedBooking && mapOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-96">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Customer Location - {selectedBooking.customerId?.name || 'Unknown Customer'}
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
          className="fixed bottom-4 right-20 z-50 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-colors"
          title="View Map"
        >
          <Navigation size={20} />
        </button>
      )}
    </div>
  );
};

export default MechanicDashboard;