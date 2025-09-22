import React, { useState, useEffect} from 'react';
import { User, LogOut, Home, MapPin ,Calculator,Wrench} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { notificationSound } from '../util/notificationSound';
import toast from 'react-hot-toast';
import axios from 'axios';
import socket from '../socket';
import LocationSelector from '../ServiceBooking/SelectLocation';
// Chat removed per requirement


const BASE_URI = import.meta.env.VITE_API_URL;
interface ServiceHistory {
  _id: string;
  date: string | null;
  type: string;
  bike: string;
  status: string;
  details: string;
  garage: string;
  slot: string;
  location: { lat: number; lon: number } | null;
}

interface Bike {
  brand: string;
  model: string;
  number: string;
}

interface Address {
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  lat: number;
  lon: number;
}



const CustomerDashboard: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'dashboard' | 'profile' | 'book' | 'chat'>('dashboard');
  const [customer, setCustomer] = useState<{ name: string; email: string; phone: string; avatar?: string } | null>(null);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceHistory | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [newAddress, setNewAddress] = useState({ label: '', street: '', city: '', state: '', zipCode: '', lat: 0, lon: 0 });
  const [bookingForm, setBookingForm] = useState({
    name: user?.name || '',
    mobile: user?.phone || '',
    brand: '',
    model: '',
    serviceType: '',
    date: '',
    slot: '',
    bikeNumber: '',
    address: '',
    description: '',
    lat: 0,
    lon: 0,
  });
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState<string | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  
  
  

  const [trackingOpen, setTrackingOpen] = useState(false);
 
  const [selectedBookingForTracking, setSelectedBookingForTracking] = useState<string | null>(null);

  // Fetch customer data
  const reloadCustomerData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URI}/api/customers/me`, { withCredentials: true });
      console.log('Customer data response:', response.data);
      setCustomer({ name: response.data.name, email: response.data.email, phone: response.data.phone, avatar: response.data.avatar });
      setBikes(response.data.bikes || []);
      setSavedAddresses(response.data.savedAddresses || []);
      setServiceHistory(response.data.serviceHistory || []);
    } catch (error: any) {
      console.error('[CustomerDashboard] Initial customer data load failed:', error);
      if (error.response?.status === 404) {
        // Create customer profile if it doesn't exist
        try {
          const createResponse = await axios.post(`${BASE_URI}/api/customers/me`, {}, { withCredentials: true });
          console.log('Created customer profile:', createResponse.data);
          toast.success('Customer profile created successfully');
          // Retry loading data
          const retryResponse = await axios.get(`${BASE_URI}/api/customers/me`, { withCredentials: true });
          setCustomer({ name: retryResponse.data.name, email: retryResponse.data.email, phone: retryResponse.data.phone, avatar: retryResponse.data.avatar });
          setBikes(retryResponse.data.bikes || []);
          setSavedAddresses(retryResponse.data.savedAddresses || []);
          setServiceHistory(retryResponse.data.serviceHistory || []);
        } catch (createError: any) {
          console.error('Error creating customer profile:', createError);
          toast.error('Failed to create customer profile');
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to load customer data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only reload data if user is authenticated
    if (user) {
      reloadCustomerData();
    }
  }, [user]); // Add user as dependency

  // Load stored notifications
  

  // Sync formData with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      setBookingForm((prev) => ({
        ...prev,
        name: user.name || '',
        mobile: user.phone || '',
      }));
    }
  }, [user]);

  // Socket.IO for booking status updates
  useEffect(() => { 
    const handleBookingStatusUpdate = (data: { bookingId: string; status: string }) => {
      if (data.bookingId === waitingForApproval) {  
        setWaitingForApproval(null);
        toast.success(`Booking ${data.status}!`);
        reloadCustomerData();
        navigate('/customer');
      }
    };
    socket.on('bookingStatusUpdate', handleBookingStatusUpdate);

    // --- Real-time booking events ---
    const handleBookingAccepted = () => {
      toast.success('Your booking was accepted by a garage!');
      notificationSound.play();
    
      reloadCustomerData();
    };
    const handleBookingAssigned = () => {
      toast.success('A mechanic has been assigned to your booking!');
      notificationSound.play();
     
      reloadCustomerData();
    };

    const handleBookingCompleted = () => {
      toast.success('Your service has been completed!');
      notificationSound.play();
      
      reloadCustomerData();
    };

    const handleBookingCancelled = () => {
      toast.error('Your booking has been cancelled.');
      notificationSound.play();
      
      reloadCustomerData();
    };
    socket.on('booking:accepted', handleBookingAccepted);
    socket.on('booking:assigned', handleBookingAssigned);
    socket.on('booking:completed', handleBookingCompleted);
    socket.on('booking:cancelled', handleBookingCancelled);
    socket.on('notification', () => {
    
    });
    // --- End real-time booking events ---

    return () => {
      socket.off('bookingStatusUpdate', handleBookingStatusUpdate);
      socket.off('booking:accepted', handleBookingAccepted);
      socket.off('booking:assigned', handleBookingAssigned);
      socket.off('booking:completed', handleBookingCompleted);
      socket.off('booking:cancelled', handleBookingCancelled);
      socket.off('notification');
    };
  }, [waitingForApproval, navigate]);



  // Handlers
  const handleBookingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setBookingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGetLocation = async () => {
    setShowLocationSelector(!showLocationSelector);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const fullAddress = data.display_name || `${latitude}, ${longitude}`;
            setBookingForm((prev) => ({ ...prev, address: fullAddress, lat: latitude, lon: longitude }));
          } catch (error) {
            toast.error('Failed to fetch address.');
            console.error(error);
          }
        },
        (error) => {
          toast.error('Location access denied.');
          console.error(error);
        }
      );
    } else {
      toast.error('Geolocation not supported.');
    }
  };

  const handleSavedAddressSelect = (address: string, lat: number, lon: number) => {
    setBookingForm((prev) => ({ ...prev, address, lat, lon }));
    setShowSavedAddresses(false);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const response = await axios.post(
        `${BASE_URI}/api/bookings/book`,
        { ...bookingForm, customerId: user?._id },
        { withCredentials: true }
      );
  
      // Emit socket event to notify nearby garages
      socket.emit('newBooking', {
        bookingId: response.data._id,
        customerId: user?.id || user?._id,
        serviceType: bookingForm.serviceType,
        lat:bookingForm.lat,
        lon:bookingForm.lon, // Assuming bookingForm has location data
        createdAt: new Date().toISOString(),
      });
  
      setWaitingForApproval(response.data._id);
      toast.success('Booking submitted! Waiting for garage to accept.');
      navigate("/dashboard")
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('Booking error:', err);
      toast.error(err.response?.data?.message || 'Failed to place booking.');
      setIsSubmitting(false);
    }
  };
  
  // Optional: Cleanup socket connection when component unmounts
  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, []);
  const handleCancelConfirm = async (bookingId: string) => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }
    try {
      await axios.put(
        `${BASE_URI}/api/bookings/cancel/${bookingId}`,
        { cancellationReason: cancelReason },
        { withCredentials: true }
      );
      toast.success('Booking cancelled successfully');
      setShowCancelForm(null);
      setCancelReason('');
      reloadCustomerData();
    } catch (err: any) {
      console.error('[CustomerDashboard] Cancellation error:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(formData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
      reloadCustomerData();
    } catch (err: any) {
      console.error('[CustomerDashboard] Profile update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.label || !newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode) {
      toast.error('Please fill all address fields');
      return;
    }
    
    try {
      await axios.put(
        `${BASE_URI}/api/customers/me`,
        { savedAddresses: [...savedAddresses, newAddress] },
        { withCredentials: true }
      );
      toast.success('Address added successfully');
      setNewAddress({ label: '', street: '', city: '', state: '', zipCode: '', lat: 0, lon: 0 });
      reloadCustomerData();
    } catch (err: any) {
      console.error('[CustomerDashboard] Add address error:', err);
      toast.error(err.response?.data?.message || 'Failed to add address');
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-500';
      case 'accepted': return 'text-green-500';
      case 'completed': return 'text-blue-500';
      case 'cancelled': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };



  const upcomingService = serviceHistory
    ?.filter((b) => ['pending', 'accepted'].includes(b.status))
    ?.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())[0];

  const primaryBike = bikes[0] || { brand: 'N/A', model: 'N/A', number: 'N/A' };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-900 min-h-screen relative">
      {/* Waiting Animation */}
      {waitingForApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-t-green-600 border-gray-200 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-white text-sm">Waiting for garage to accept...</p>
          </div>
        </div>
      )}

      {/* Profile Menu */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button onClick={() => setShowMenu(!showMenu)} className="bg-white dark:bg-gray-800 rounded-full p-2 shadow mb-10">
          <User size={20} />
        </button>
        
       
        {showMenu && (
          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-xl py-2 z-10">
            <button className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" /> Home
            </button>
            <button className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" onClick={() => setView('dashboard')}>
              <Calculator className="w-4 h-4 mr-2" /> Dashboard
            </button>
            <button className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" onClick={() => setView('profile')}>
              <User className="w-4 h-4 mr-2" /> Profile
            </button>
            <button className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm" onClick={() => setView('book')}>
              <Wrench className="w-4 h-4 mr-2" /> Book Service
            </button>
           
            <button
              className="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 text-sm"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 sm:gap-4 border-b border-gray-200 dark:border-gray-700">
        {['dashboard', 'profile', 'book'].map((tab) => (
          <button
            key={tab}
            className={`pb-2 px-3 sm:px-4 font-semibold text-sm sm:text-base ${view === tab ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-500'}`}
            onClick={() => setView(tab as 'dashboard' | 'profile' | 'book' | 'chat')}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {view === 'dashboard' && (
        <>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome, {customer?.name || user?.name || 'Guest'} 👋</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your Bike: {primaryBike.brand} {primaryBike.model} ({primaryBike.number})
            </p>
          </div>
          <div>
            <button
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 sm:px-6 py-2 rounded-full shadow-md transition"
              onClick={() => setView('book')}
            >
              Book a Service
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow">
            <h2 className="text-lg sm:text-xl font-semibold mb-3">Upcoming Service</h2>
            {upcomingService ? (
              <div className="space-y-1 text-sm sm:text-base">
                <p><strong>Date:</strong> {upcomingService.date ? new Date(upcomingService.date).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Time:</strong> {upcomingService.slot || ''}</p>
                <p><strong>Type:</strong> {upcomingService.type || ''}</p>
                <p><strong>Garage:</strong> {upcomingService.garage || ''}</p>
                <p><strong>Status:</strong> <span className={getStatusColor(upcomingService.status)}>{upcomingService.status || 'N/A'}</span></p>
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  {/* Phone contact details */}
                  <span className="text-gray-500 text-sm px-3 py-1">
                    Garage Phone: {user?.role === 'customer' ? (selectedService ? '' : '') : ''}
                  </span>
                  <a
                    href={upcomingService.location ? `https://www.google.com/maps?q=${upcomingService.location.lat},${upcomingService.location.lon}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1 rounded-full text-sm"
                  >
                    Track Service
                  </a>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-1 rounded-full text-sm"
                    onClick={() => setShowCancelForm(upcomingService._id)}
                  >
                    Cancel
                  </button>
                </div>
                {showCancelForm === upcomingService._id && (
                  <div className="mt-4 p-4 border border-red-400 bg-red-50 dark:bg-red-900 rounded-xl">
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Cancel Service</h3>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
                      rows={3}
                      placeholder="Explain the reason..."
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-1 rounded-full text-sm"
                        onClick={() => handleCancelConfirm(upcomingService._id)}
                      >
                        Confirm Cancel
                      </button>
                      <button
                        className="bg-gray-300 hover:bg-gray-400 text-black dark:text-white px-3 sm:px-4 py-1 rounded-full text-sm"
                        onClick={() => setShowCancelForm(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming services.</p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow">
            <h2 className="text-lg sm:text-xl font-semibold mb-3">Service History</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-600">
                  <th className="pb-2 text-left">Date</th>
                  <th className="pb-2 text-left">Type</th>
                  <th className="pb-2 text-left">Bike</th>
                  <th className="pb-2 text-left">Status</th>
                  <th className="pb-2 text-left">Chat</th>
                  <th className="pb-2 text-left">Track</th>
                </tr>
              </thead>
              <tbody>
                {serviceHistory?.map((entry) => (
                  <tr
                    key={entry._id}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setSelectedService(entry)}
                  >
                    <td>{entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}</td>
                    <td>{entry.type}</td>
                    <td>{entry.bike}</td>
                    <td className={getStatusColor(entry.status)}>{entry.status}</td>
                    <td>
                      <span className="text-gray-500 text-sm">
                        Use chat button
                      </span>
                    </td>
                    <td>
                      {['confirmed', 'assigned', 'on-way', 'arrived', 'working'].includes(entry.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBookingForTracking(entry._id);
                            setTrackingOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                        >
                          <MapPin className="h-4 w-4" />
                          <span>Track</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {serviceHistory?.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">No service history available.</p>
            )}
            {selectedService && (
              <div className="mt-4 p-4 border rounded-xl bg-gray-50 dark:bg-gray-700">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Service Details</h3>
                <p><strong>Date:</strong> {selectedService.date ? new Date(selectedService.date).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Type:</strong> {selectedService.type}</p>
                <p><strong>Bike:</strong> {selectedService.bike}</p>
                <p><strong>Status:</strong> <span className={getStatusColor(selectedService.status)}>{selectedService.status}</span></p>
                <p><strong>Details:</strong> {selectedService?.details}</p>
                
                {/* Action Buttons */}
                <div className="flex space-x-2 mt-4">
                 
                  
                  {/* Real-time Tracking for active bookings */}
                  {['confirmed', 'assigned', 'on-way', 'arrived', 'working'].includes(selectedService.status) && (
                    <button
                      onClick={() => {
                        setSelectedBookingForTracking(selectedService._id);
                        setTrackingOpen(true);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors"
                    >
                      🗺️ Track
                    </button>
                  )}
                  
                  <button 
                    className="text-red-500 hover:text-red-700 text-xs hover:underline" 
                    onClick={() => setSelectedService(null)}
                  >
                    Close
                  </button>
                </div>
                
                {/* Real-time Tracking for active bookings */}
                {['confirmed', 'assigned', 'on-way', 'arrived', 'working'].includes(selectedService.status) && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-sm">Live Tracking</h4>
                    
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow">
            <h2 className="text-lg sm:text-xl font-semibold mb-3">My Bikes</h2>
            <ul className="list-disc list-inside text-sm sm:text-base">
              {bikes.map((bike, index) => (
                <li key={index}>{bike.brand} {bike.model} ({bike.number})</li>
              ))}
            </ul>
            {bikes.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No bikes added.</p>
            )}
            <button className="mt-2 text-blue-500 hover:underline text-sm" onClick={() => setView('book')}>
              Add New Bike
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow">
            <h2 className="text-lg sm:text-xl font-semibold mb-3">Saved Addresses</h2>
            <ul className="list-disc list-inside text-sm sm:text-base">
              {savedAddresses.map((addr, index) => (
                <li key={index}>
                  <strong>{addr.label}:</strong> {addr.street}, {addr.city}, {addr.state}, {addr.zipCode}
                </li>
              ))}
            </ul>
            {savedAddresses.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No addresses saved.</p>
            )}
            <button className="mt-2 text-blue-500 hover:underline text-sm" onClick={() => setView('profile')}>
              Manage Addresses
            </button>
          </div>
        </>
      )}

      {view === 'profile' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="text-center">
                <img
                  src={customer?.avatar || user?.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'}
                  alt={customer?.name || user?.name || 'User'}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{customer?.name || user?.name || 'N/A'}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{customer?.email || user?.email || 'N/A'}</p>
             
              </div>
            </div>
            <div className="sm:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>
              <div className="space-y-4">
                {['name', 'email', 'phone'].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                      value={formData[field as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-600 text-sm"
                    />
                  </div>
                ))}
              </div>
              {isEditing && (
                <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-4">
                  <button
                    onClick={handleSaveProfile}
                    className="bg-primary-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors text-sm"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Manage Addresses</h3>
                <ul className="list-disc list-inside mb-4 text-sm sm:text-base">
                  {savedAddresses.map((addr, index) => (
                    <li key={index}>
                      <strong>{addr.label}:</strong> {addr.street}, {addr.city}, {addr.state}, {addr.zipCode}
                    </li>
                  ))}
                </ul>
                <div className="space-y-4">
                  {['label', 'street', 'city', 'state', 'zipCode'].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <input
                        type={field === 'zipCode' ? 'number' : 'text'}
                        value={newAddress[field as keyof typeof newAddress]}
                        onChange={(e) => setNewAddress({ ...newAddress, [field]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  ))}
                  <button
                    onClick={handleAddAddress}
                    className="bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    Add Address
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'book' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Book Service</h1>
          <form
            onSubmit={handleBookingSubmit}
            className="bg-white dark:bg-gray-800 dark:text-white shadow-xl rounded-2xl p-4 sm:p-6 w-full max-w-md mx-auto transition"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400 mb-4 sm:mb-6 text-center">Book Your Bike Service</h2>
            {[
              { label: 'Full Name', name: 'name', type: 'text', placeholder: 'e.g. Rajesh Kumar' },
              { label: 'Mobile Number', name: 'mobile', type: 'tel', placeholder: 'e.g. 9876543210', pattern: '[0-9]{10}', maxLength: 10 },
              { label: 'Brand Name', name: 'brand', type: 'text', placeholder: 'e.g. Honda, Yamaha' },
              { label: 'Model', name: 'model', type: 'text', placeholder: 'e.g. Splendor Plus' },
              { label: 'Bike Number', name: 'bikeNumber', type: 'text', placeholder: 'e.g. MH12 AB 1234' },
            ].map((field) => (
              <div className="mb-4" key={field.name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={bookingForm[field.name as keyof typeof bookingForm]}
                  onChange={handleBookingChange}
                  placeholder={field.placeholder}
                  pattern={field.pattern}
                  maxLength={field.maxLength}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500 text-sm"
                  required
                />
              </div>
            ))}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Service Type</label>
              <select
                name="serviceType"
                value={bookingForm.serviceType}
                onChange={handleBookingChange}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500 text-sm"
                required
              >
                <option value="">Select</option>
                <option value="doorstep">Doorstep Service</option>
                <option value="garage">Garage Dropoff</option>
                <option value="emergency">Emergency Service</option>
              </select>
            </div>
            {bookingForm.serviceType !== 'emergency' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Slot</label>
                  <select
                    name="slot"
                    value={bookingForm.slot}
                    onChange={handleBookingChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500 text-sm"
                    required
                  >
                    <option value="">Select Slot</option>
                    <option value="morning">Morning (9 AM - 12 PM)</option>
                    <option value="afternoon">Afternoon (1 PM - 4 PM)</option>
                    <option value="evening">Evening (5 PM - 8 PM)</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Date</label>
                  <input
                    type="date"
                    name="date"
                    value={bookingForm.date}
                    onChange={handleBookingChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500 text-sm"
                    required
                  />
                </div>
              </>
            )}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="bg-green-600 text-white px-3 sm:px-4 py-1 rounded hover:bg-green-700 text-sm"
                >
                  Use My Current Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavedAddresses(!showSavedAddresses)}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                >
                  Choose from Saved
                </button>
              </div>
              {showSavedAddresses && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 space-y-1 mb-2">
                 
                { savedAddresses.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm">No saved addresses</div>
                  ) : (
                    savedAddresses.map((addr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSavedAddressSelect(`${addr.street}, ${addr.city}, ${addr.state}, ${addr.zipCode}`, addr.lat, addr.lon)}
                        className="block w-full text-left hover:text-green-600 text-sm dark:text-white"
                      >
                        {addr.label}: {addr.street}, {addr.city}, {addr.state}, {addr.zipCode}
                      </button>
                    ))
                  )}
                </div>
              )}
              {showLocationSelector && (
                <LocationSelector
                  onLocationSelect={(lat, lng) => {
                    setBookingForm((prev) => ({
                      ...prev,
                      address: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
                      lat,
                      lon: lng,
                    }));
                  }}
                />
              )}
              <textarea
                name="address"
                value={bookingForm.address}
                onChange={handleBookingChange}
                rows={3}
                placeholder="Enter address or wait for location detection"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500 text-sm"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Description</label>
              <textarea
                name="description"
                value={bookingForm.description}
                onChange={handleBookingChange}
                rows={3}
                placeholder="Describe the issue with your bike (e.g. engine noise, oil leak)"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 sm:mt-6 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400 text-sm"
            >
              Confirm Booking
            </button>
          </form>
        </div>
      )}

      {/* Chat tab removed */}
      <div className="relative flex items-center space-x-2">

      </div>

      {/* Chat removed */}

      {/* Live Tracking Component */}
      {trackingOpen && selectedBookingForTracking && (
        <div className="fixed bottom-4 left-4 z-50">
         
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
