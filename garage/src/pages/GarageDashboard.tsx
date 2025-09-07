import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { Building, Calendar, Users, DollarSign, LogOut, MessageCircle, User, Bell, Clock, Receipt, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBooking } from '../contexts/BookingContext';
import { notificationSound } from '../util/notificationSound';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ChatBox from '../ChatComponent/ChatBox';
import RealTimeTracker from '../tracking/RealTimeTracker';
import LiveTrackingMap from '../tracking/LiveTrackingMap';
import BillingComponent from './BillingComponent';
import ThemeToggle from '../ThemeToggle';
import PendingOrders from './PendingOrders';
import socket from '../socket';

// Define interfaces (aligned with BookingContext and backend)
interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface Service {
  _id: string;
  name: string;
}

interface Booking {
  _id: string;
  customerId: Customer; // Dashboard-specific
  customer: string; // Backend ID reference
  customerName: string; // From newBookingRequest
  serviceId: Service; // Dashboard-specific
  serviceType: string; // From newBookingRequest
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  scheduledDate: string;
  scheduledTime: string;
  totalAmount?: number;
  createdAt: string;
  bikeNumber?: string;
  brand?: string;
  model?: string;
  slot?: string;
  address?: string;
  description?: string;
  location?: { lat: number; lon: number };
  garage?: { id: string; name: string; phone: string };
  mechanic?: { id: string; name: string; phone: string };
}

interface UserId {
  email: string;
  phone: string;
}

interface Location {
  coordinates: string[];
}

interface Mechanic {
  _id: string;
  name: string;
  email: string;
  userId: UserId;
  location: Location;
  phone: string;
  skills?: string[];
  lat?: number;
  lng?: number;
}

// User type is imported from AuthContext

// Leaflet marker icon configuration
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const GarageDashboard: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const { bookingList, mechanicList, acceptBooking, deleteMechanic, pendingBookingList, reloadData,garageId } = useBooking();
  const [activeTab, setActiveTab] = useState<string>('pending-orders');
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedMechanicId, setExpandedMechanicId] = useState<string | null>(null);
  const [showMapId, setShowMapId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<{ name: string; email: string }>({ name: '', email: '' });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; type: string; message: string; timestamp: Date; payload?: any; read: boolean }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingCollapsed, setTrackingCollapsed] = useState(false);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showNotifications && !target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const navigate = useNavigate();

  // Initialize profile form with user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Initialize Socket.IO and register garage
  useEffect(() => {
    if (user?._id && user?.role === 'garage') {
      // The socket is already initialized in socket.ts, so we can use it directly
      setSocket(socket);

      const handleConnect = () => {
        console.log('Garage socket connected');
        if (socket && user?._id) {
          socket.emit('register', { userId: user._id, role: 'garage' });
        }
      };

      const handleConnectError = (err: Error) => {
        console.error('Socket connection error:', err);
        toast.error('Failed to connect to server', {
          position: 'top-right',
          duration: 5000,
        });
      };

      const handleNewBooking = (data: Booking) => {
        toast.success(`📥 New booking from ${data.customerName}!`, {
          position: 'top-right',
          duration: 5000,
        });
        notifySystem('New Booking', `Booking from ${data.customerName} received.`);
        reloadData();
      };

      const handleBookingStored = (data: { bookingId: string; booking: Booking; message: string }) => {
        toast.success(data.message, {
          position: 'top-right',
          duration: 5000,
        });
        notifySystem('Booking Stored', data.message);
        reloadData();
      };

      const handleBookingClosed = (data: { bookingId: string; acceptingGarageId: string; message: string }) => {
        toast.success(data.message, {
          position: 'top-right',
          duration: 5000,
        });
        notifySystem('Booking Closed', data.message);
        reloadData();
      };
      // --- End real-time booking events ---

      // --- Real-time notification events ---
      const handleNotification = (data: { type: string; message: string; payload?: any; timestamp: Date }) => {
        setNotifications(prev => [
          {
            id: `${data.type}-${Date.now()}`,
            type: data.type,
            message: data.message,
            timestamp: new Date(data.timestamp),
            payload: data.payload,
            read: false
          },
          ...prev
        ]);
        
        // Show toast and play sound for important notifications
        if (data.type === 'booking:new' || data.type === 'booking:accepted' || data.type === 'booking:completed' || data.type === 'booking:cancelled') {
          toast.success(data.message, {
            position: 'top-right',
            duration: 3000,
            icon: '💬',
          });
          notificationSound.play();
        } else if (data.type === 'chat:message') {
          toast(data.message, {
            position: 'top-right',
            duration: 3000,
            icon: '💬',
          });
          notificationSound.play();
        }
      };

      // Set up socket event listeners with null check
      if (socket) {
        socket.on('connect', handleConnect);
        socket.on('connect_error', handleConnectError);
        socket.on('booking:new', handleNewBooking);
        socket.on('booking:stored', handleBookingStored);
        socket.on('booking:closed', handleBookingClosed);
        socket.on('notification', handleNotification);
      }

      // Cleanup function
      return () => {
        if (socket) {
          // Remove all event listeners
          socket.off('connect', handleConnect);
          socket.off('connect_error', handleConnectError);
          socket.off('booking:new', handleNewBooking);
          socket.off('booking:stored', handleBookingStored);
          socket.off('booking:closed', handleBookingClosed);
          socket.off('notification', handleNotification);
          
          // Disconnect socket
          socket.disconnect();
          console.log('Garage socket disconnected');
        }
      };
    }
  }, [user, reloadData]);

  // Browser notification function
  const notifySystem = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
          });
        }
      });
    }
  };

  // Set loading state
  useEffect(() => {
    if (bookingList && mechanicList && user) {
      setLoading(false);
    }
  }, [bookingList, mechanicList, user]);

  // Load stored notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/notifications', {
          credentials: 'include'
        });
        if (response.ok) {
          const storedNotifications = await response.json();
          setNotifications(prev => [
            ...storedNotifications.map((n: any) => ({
              id: n._id,
              type: n.type,
              message: n.message,
              timestamp: new Date(n.timestamp),
              payload: n.payload,
              read: n.read
            })),
            ...prev
          ]);
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    if (user) {
      loadNotifications();
    }
  }, [user]);

  // Handle booking acceptance
  const handleAcceptBooking = async (bookingId: string, mechanicId: string) => {
    if (!mechanicId) {
      toast.error('Please select a mechanic', {
        position: 'top-right',
        duration: 5000,
      });
      return;
    }
    try {
      await acceptBooking(bookingId, mechanicId);
      toast.success('Booking accepted successfully', {
        position: 'top-right',
        duration: 5000,
      });
      notifySystem('Booking Accepted', 'Mechanic assigned successfully.');
    } catch (error: any) {
      console.error('Error accepting booking:', error);
      toast.error(error.response?.data?.message || 'Failed to accept booking', {
        position: 'top-right',
        duration: 5000,
      });
    }
  };

  // Handle mechanic deletion
  const handleDeleteMechanic = async (mechanicId: string) => {
    if (window.confirm('Are you sure you want to delete this mechanic?')) {
      try {
        await deleteMechanic(mechanicId);
        toast.success('Mechanic deleted successfully', {
          position: 'top-right',
          duration: 5000,
        });
      } catch (error: any) {
        console.error('Error deleting mechanic:', error);
        toast.error(error.response?.data?.message || 'Failed to delete mechanic', {
          position: 'top-right',
          duration: 5000,
        });
      }
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error('Name is required', {
        position: 'top-right',
        duration: 5000,
      });
      return;
    }
    try {
      await updateProfile({ name: profileForm.name, email: profileForm.email });
      toast.success('Profile updated successfully', {
        position: 'top-right',
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile', {
        position: 'top-right',
        duration: 5000,
      });
    }
  };

  // Get status color for bookings
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'confirmed':
      case 'accepted':
        return 'text-blue-600 bg-blue-100';
      case 'in-progress':
        return 'text-purple-600 bg-purple-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Calculate total revenue
  const totalRevenue = bookingList
    .filter((booking) => booking.status === 'completed')
    .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

  // Render dashboard content
  const renderDashboardContent = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{bookingList.length}</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingBookingList.length}</p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalRevenue}</p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Bookings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Bookings</h3>
        <div className="space-y-4">
          {bookingList.slice(0, 5).map((booking) => (
            <div
              key={booking._id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">{booking.serviceType || booking.serviceId?.name || 'N/A'}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customer: {booking.customerName || booking.customerId?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : 'N/A'} at{' '}
                  {booking.scheduledTime || booking.slot || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status || 'N/A'}
                </span>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  ₹{booking.totalAmount || 0}
                </p>
              </div>
            </div>
          ))}
          {bookingList.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No bookings yet.</p>
          )}
        </div>
      </motion.div>
    </div>
  );

  // Render pending orders content
  const renderPendingOrdersContent = () => (
    <PendingOrders 
      onBookingAccepted={(bookingId) => {
        toast.success('Booking accepted successfully!');
        reloadData();
      }}
      onBookingRejected={(bookingId) => {
        toast.success('Booking rejected successfully!');
        reloadData();
      }}
    />
  );

  // Render bookings content
  const renderBookingsContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Bookings</h2>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="space-y-4">
          {bookingList.map((booking) => (
            <div key={booking._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">{booking.serviceType || booking.serviceId?.name || 'N/A'}</h4>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}
                >
                  {booking.status || 'N/A'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Customer</p>
                  <p className="font-medium text-gray-900 dark:text-white">{booking.customerName || booking.customerId?.name || 'N/A'}</p>
                  <p className="text-gray-500">{booking.customerId?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Bike Details</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {booking.brand || 'N/A'} {booking.model || 'N/A'} ({booking.bikeNumber || 'N/A'})
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Scheduled</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-gray-500">{booking.scheduledTime || booking.slot || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Amount</p>
                  <p className="font-medium text-gray-900 dark:text-white">₹{booking.totalAmount || 0}</p>
                </div>
              </div>
              {booking.status === 'pending' && (
                <div className="flex space-x-2">
                  <select
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    onChange={(e) => handleAcceptBooking(booking._id, e.target.value)}
                  >
                    <option value="">Select Mechanic</option>
                    {mechanicList.map((mechanic) => (
                      <option key={mechanic._id} value={mechanic._id}>
                        {mechanic.name} ({mechanic.skills?.join(', ') || 'N/A'})
                      </option>
                    ))}
                  </select>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    disabled
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setChatOpen(true);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Chat
                  </button>
                </div>
              )}
              
              {/* Real-time Tracking for active bookings */}
              {['accepted', 'in-progress', 'on-way', 'arrived', 'working'].includes(booking.status) && (
                <div className="mt-4">
                  <RealTimeTracker 
                    bookingId={booking._id}
                    isActive={true}
                  />
                </div>
              )}
            </div>
          ))}
          {bookingList.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No bookings found.</p>
          )}
        </div>
      </div>
    </div>
  );

  // Render mechanics content
  const renderMechanicsContent = () => (
    <div className="p-6 max-w-4xl mx-auto">
      <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
        {garageId || 'Guest'}
      </p>

      <h3 className="text-2xl font-bold mb-6 text-center text-green-700 dark:text-green-400">
        Mechanic Management
      </h3>

      {mechanicList.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-400">
          No mechanics found.
        </p>
      ) : (
        <div className="space-y-4">
          {mechanicList.map((mechanic) => (
            <div
              key={mechanic._id}
              className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow cursor-pointer"
              onClick={() => {
                setExpandedMechanicId(
                  expandedMechanicId === mechanic._id ? null : mechanic._id
                );
                setShowMapId(null); // Reset map when collapsing
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-400">
                    {mechanic.name || 'N/A'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Phone: {mechanic.userId?.phone || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMechanic(mechanic._id);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl shadow transition"
                >
                  Delete
                </button>
              </div>

              {expandedMechanicId === mechanic._id && (
                <div className="mt-4 text-gray-700 dark:text-gray-300 text-sm space-y-2">
                  <p>Email: {mechanic.userId?.email || 'N/A'}</p>
                  <p>Skills: {mechanic.skills?.join(', ') || 'N/A'}</p>

                  {mechanic.lat && mechanic.lng && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMapId(
                          showMapId === mechanic._id ? null : mechanic._id
                        );
                      }}
                      className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl shadow transition"
                    >
                      {showMapId === mechanic._id ? 'Hide Map' : 'Track Mechanic'}
                    </button>
                  )}

                  {showMapId === mechanic._id && mechanic.lat && mechanic.lng && (
                    <div className="h-64 w-full rounded-xl overflow-hidden mt-4 border border-green-500 dark:border-green-400 shadow">
                      <MapContainer
                        center={[mechanic.lat, mechanic.lng]}
                        zoom={17}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker
                          position={[mechanic.lat, mechanic.lng]}
                          icon={markerIcon}
                        >
                          <Popup>Mechanic: {mechanic.name || 'N/A'}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render chat content
  const renderChatContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chat</h2>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Chat with Customers</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Select a booking to start chatting with the customer.
        </p>
        <div className="space-y-2">
          {bookingList.filter(booking => ['accepted', 'in-progress', 'on-way', 'arrived', 'working'].includes(booking.status)).map((booking) => (
            <button
              key={booking._id}
              onClick={() => {
                setSelectedBooking(booking);
                setChatOpen(true);
              }}
              className="w-full p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {booking.customerId?.name || booking.customerName || 'Unknown Customer'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {booking.serviceId?.name || booking.serviceType || 'Unknown Service'}
                  </p>
                  {booking.mechanic && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Mechanic: {typeof booking.mechanic === 'string' ? 'Assigned' : booking.mechanic?.name || 'Unknown'}
                    </p>
                  )}
                </div>
                <MessageCircle size={20} className="text-blue-500" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Render billing content
  const renderBillingContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Billing Management</h2>
        <button
          onClick={() => setBillingOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <Receipt className="h-5 w-5" />
          <span>Create New Bill</span>
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="text-center py-12">
          <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Billing Dashboard</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create and manage customer bills, track payments, and generate invoices
          </p>
          <button
            onClick={() => setBillingOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Open Billing System
          </button>
        </div>
      </div>
    </div>
  );

  // Render tracking content
  const renderTrackingContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live Tracking</h2>
        <button
          onClick={() => setTrackingOpen(!trackingOpen)}
          className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
            trackingOpen 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <MapPin className="h-5 w-5" />
          <span>{trackingOpen ? 'Close Tracking' : 'Open Tracking'}</span>
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <div className="text-center py-12">
          <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Real-time Location Tracking</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Track customer and mechanic locations in real-time for active bookings
          </p>
          <button
            onClick={() => setTrackingOpen(!trackingOpen)}
            className={`px-6 py-2 rounded-lg transition-colors ${
              trackingOpen 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {trackingOpen ? 'Close Tracking Map' : 'Open Tracking Map'}
          </button>
        </div>
      </div>
    </div>
  );

  // Render profile content
  const renderProfileContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Update Profile</h2>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg max-w-md mx-auto"
      >
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-green-500 focus:border-green-500"
              placeholder="Enter your name"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-green-500 focus:border-green-500"
              placeholder="Enter your email"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Update Profile
          </button>
        </form>
      </motion.div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-400 to-green-600 p-2 rounded-lg">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Garage Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back, {user?.name || 'Guest'}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              
              {/* Notification Bell */}
              <div className="relative notification-dropdown">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    </div>
                    <div className="p-2">
                      {notifications.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">No notifications</p>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                              notification.read 
                                ? 'bg-gray-50 dark:bg-gray-700' 
                                : 'bg-green-50 dark:bg-green-900/20'
                            }`}
                            onClick={async () => {
                              setNotifications(prev => 
                                prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                              );
                              
                              // Mark as read in database
                              try {
                                await fetch(`http://localhost:5000/api/notifications/${notification.id}/read`, {
                                  method: 'PUT',
                                  credentials: 'include'
                                });
                              } catch (error) {
                                console.error('Failed to mark notification as read:', error);
                              }
                            }}
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={async () => {
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            
                            // Mark all as read in database
                            try {
                              await fetch('http://localhost:5000/api/notifications/read-all', {
                                method: 'PUT',
                                credentials: 'include'
                              });
                            } catch (error) {
                              console.error('Failed to mark all notifications as read:', error);
                            }
                          }}
                          className="w-full text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                        >
                          Mark all as read
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="lg:flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors hidden"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
              <ul className="space-y-2">
                {[
                  { id: 'pending-orders', label: 'Pending Orders', icon: Clock },
                  { id: 'dashboard', label: 'Dashboard', icon: Building },
                  { id: 'bookings', label: 'Bookings', icon: Calendar },
                  { id: 'mechanics', label: 'Mechanics', icon: Users },
                  { id: 'billing', label: 'Billing', icon: Receipt },
                  { id: 'tracking', label: 'Live Tracking', icon: MapPin },
                  { id: 'chats', label: 'Chat', icon: MessageCircle },
                  { id: 'profile', label: 'Profile', icon: User },
                ].map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === item.id
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'pending-orders' && renderPendingOrdersContent()}
            {activeTab === 'dashboard' && renderDashboardContent()}
            {activeTab === 'bookings' && renderBookingsContent()}
            {activeTab === 'mechanics' && renderMechanicsContent()}
            {activeTab === 'billing' && renderBillingContent()}
            {activeTab === 'tracking' && renderTrackingContent()}
            {activeTab === 'chats' && renderChatContent()}
            {activeTab === 'profile' && renderProfileContent()}
          </div>
        </div>
      </div>

      {/* Chat Component */}
      {selectedBooking && (
        <ChatBox
          bookingId={selectedBooking._id}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          onMinimize={() => setChatMinimized(!chatMinimized)}
          isMinimized={chatMinimized}
        />
      )}
      
      {/* Chat Toggle Button */}
      {selectedBooking && (
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-4 right-4 z-50 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Open Chat"
        >
          💬
        </button>
      )}

      {/* Billing Component */}
      <BillingComponent
        bookingId={selectedBooking?._id}
        isOpen={billingOpen}
        onClose={() => setBillingOpen(false)}
      />

      {/* Live Tracking Component */}
      {trackingOpen && (
        <div className="fixed bottom-4 left-4 z-50">
          <LiveTrackingMap
            bookingId={selectedBooking?._id}
            isCollapsed={trackingCollapsed}
            onToggleCollapse={() => setTrackingCollapsed(!trackingCollapsed)}
          />
        </div>
      )}
    </div>
  );
};

export default GarageDashboard;