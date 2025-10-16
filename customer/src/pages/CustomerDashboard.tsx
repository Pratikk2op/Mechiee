import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Home, Calculator, Wrench, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationSound } from '../util/notificationSound';
import toast from 'react-hot-toast';
import axios from 'axios';
import socket from '../socket';
import LocationSelector from '../ServiceBooking/SelectLocation';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const BASE_URI = import.meta.env.VITE_API_URL;

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

// Tracking Map component
const TrackingMap: React.FC<{ customerLocation: { lat: number; lon: number }; mechanicLocation?: { lat: number; lon: number } }> = ({ customerLocation, mechanicLocation }) => {
  const map = useMap();
  
  useEffect(() => {
    if (customerLocation) {
      map.setView([customerLocation.lat, customerLocation.lon], 12);
    }
  }, [customerLocation, map]);

  return (
    <>
      <Marker 
        position={[customerLocation.lat, customerLocation.lon]} 
        icon={createCustomIcon('blue')}
      >
        <Popup>Your Location</Popup>
      </Marker>
      {mechanicLocation && (
        <Marker 
          position={[mechanicLocation.lat, mechanicLocation.lon]} 
          icon={createCustomIcon('red')}
        >
          <Popup>Mechanic Location</Popup>
        </Marker>
      )}
    </>
  );
};

interface ServiceHistory {
  mechanic: any;
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
  const [time,]=useState(new Date().toLocaleTimeString())
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'dashboard' | 'profile' | 'book'>('dashboard');
  const [customer, setCustomer] = useState<{ name: string; email: string; phone: string; avatar?: string } | null>(null);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
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
  const [waitingForApproval, setWaitingForApproval] = useState<string | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [selectedBookingForTracking, setSelectedBookingForTracking] = useState<string | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [mechanicLocation, setMechanicLocation] = useState<{ lat: number; lon: number } | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // TanStack Query for customer data
  const { data: customerData, isLoading: loading } = useQuery({
    queryKey: ['customerData'],
    queryFn: async () => {

      const response = await axios.get(`${BASE_URI}/api/customers/me`, { withCredentials: true });
      return response.data;
    },
    enabled: !!user,
    retry: (failureCount, error: any) => {

      if (error?.response?.status === 404 && failureCount < 1) {
        createProfileMutation.mutate();
        return true;
      }

      return false;

    },
  });

  // Mutation to create profile if not exists
  const createProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${BASE_URI}/api/customers/me`, {}, { withCredentials: true });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Customer profile created successfully');
      queryClient.invalidateQueries({ queryKey: ['customerData'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create customer profile');
    },
  });

  // Mutation for booking
  const bookingMutation = useMutation({
    mutationFn: async (formData: typeof bookingForm) => {
      const response = await axios.post(`${BASE_URI}/api/bookings/book`, { ...formData, customerId: user?._id }, { withCredentials: true });
      return response.data;
    },
    onSuccess: (data) => {
      socket.emit('newBooking', {
        bookingId: data._id,
        customerId: user?.id || user?._id,
        serviceType: bookingForm.serviceType,
        lat: bookingForm.lat,
        lon: bookingForm.lon,
        createdAt: new Date().toISOString(),
      });
      setWaitingForApproval(data._id);
      toast.success('Booking submitted! Waiting for garage to accept.');
      queryClient.invalidateQueries({ queryKey: ['customerData'] });
      navigate('/');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to place booking.');
    },
  });

  // Mutation for cancel booking
  const cancelMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      await axios.put(`${BASE_URI}/api/bookings/cancel/${bookingId}`, { cancelReason: reason }, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('Booking cancelled successfully');
      setShowCancelForm(null);
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: ['customerData'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    },
  });

  // Mutation for add address
  const addAddressMutation = useMutation({
    mutationFn: async (address: Address) => {
      await axios.put(`${BASE_URI}/api/customers/me`, { savedAddresses: [...savedAddresses, address] }, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('Address added successfully');
      setNewAddress({ label: '', street: '', city: '', state: '', zipCode: '', lat: 0, lon: 0 });
      queryClient.invalidateQueries({ queryKey: ['customerData'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add address');
    },
  });

  // Sync states with query data
  useEffect(() => {
    if (customerData) {
      setCustomer({ name: customerData.name, email: customerData.email, phone: customerData.phone, avatar: customerData.avatar });
      setBikes(customerData.bikes || []);
      setSavedAddresses(customerData.savedAddresses || []);
      setServiceHistory(customerData.serviceHistory || []);
    }
  }, [customerData]);

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

  // Socket.IO for real-time updates
  useEffect(() => {
    const handleBookingStatusUpdate = (data: { bookingId: string; status: string }) => {
      if (data.bookingId === waitingForApproval) {
        setWaitingForApproval(null);
        toast.success(`Booking ${data.status}!`);
        queryClient.invalidateQueries({ queryKey: ['customerData'] });
        navigate('/customer');
      }
    };

    const handleBookingAccepted = () => {
      toast.success('Your booking was accepted by a garage!');
      notificationSound.play();
      queryClient.invalidateQueries({ queryKey: ['customerData'] });
    };

    const handleBookingAssigned = () => {
      toast.success('A mechanic has been assigned to your booking!');
      notificationSound.play();
      queryClient.invalidateQueries({ queryKey: ['customerData'] });
    };

    const handleBookingCompleted = () => {
      toast.success('Your service has been completed!');
      notificationSound.play();
      queryClient.invalidateQueries({ queryKey: ['customerData'] });
    };

    const handleBookingCancelled = () => {
      toast.error('Your booking has been cancelled.');
      notificationSound.play();
      queryClient.invalidateQueries({ queryKey: ['customerData'] });
    };

    socket.on('bookingStatusUpdate', handleBookingStatusUpdate);
    socket.on('booking:accepted', handleBookingAccepted);
    socket.on('booking:assigned', handleBookingAssigned);
    socket.on('booking:completed', handleBookingCompleted);
    socket.on('booking:cancelled', handleBookingCancelled);
    socket.on('notification', () => {});

    return () => {
      socket.off('bookingStatusUpdate', handleBookingStatusUpdate);
      socket.off('booking:accepted', handleBookingAccepted);
      socket.off('booking:assigned', handleBookingAssigned);
      socket.off('booking:completed', handleBookingCompleted);
      socket.off('booking:cancelled', handleBookingCancelled);
      socket.off('notification');
    };
  }, [waitingForApproval, navigate, queryClient]);

  // Tracking data fetching
  useEffect(() => {
    if (!trackingOpen || !selectedBookingForTracking) return;

    const fetchTrackingData = async () => {
      try {
        const response = await axios.get(`${BASE_URI}/api/bookings/${selectedBookingForTracking}`, { withCredentials: true });
        const booking = response.data;
        setCustomerLocation({ lat: booking.lat, lon: booking.lon });
        setMechanicLocation(booking.trackingData?.location || null);
      } catch (err) {
        console.error('Error fetching tracking data:', err);
      }
    };

    fetchTrackingData();
    trackingIntervalRef.current = setInterval(fetchTrackingData, 120000); // 2 minutes

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    };
  }, [trackingOpen, selectedBookingForTracking]);

  // Handlers
  const handleBookingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
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
    bookingMutation.mutate(bookingForm);
  };

  const handleCancelConfirm = (bookingId: string) => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }
    cancelMutation.mutate({ bookingId, reason: cancelReason });
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(formData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['customerData'] });
    } catch (err: any) {
      console.error('[CustomerDashboard] Profile update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleAddAddress = () => {
    if (!newAddress.label || !newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode) {
      toast.error('Please fill all address fields');
      return;
    }
    addAddressMutation.mutate(newAddress);
  };

  const handleShowBill = async (bookingId: string) => {
    try {
     
      const response = await axios.get(`${BASE_URI}/api/bill/bills/${bookingId}`, { 
        responseType: 'blob',
        withCredentials: true 
      });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank');
      // Optional: Revoke URL after a delay to clean up
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error: any) {
      console.error('Error fetching bill:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch bill');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-500 bg-yellow-100';
      case 'accepted': return 'text-green-500 bg-green-100';
      case 'completed': return 'text-blue-500 bg-blue-100';
      case 'cancelled': return 'text-red-500 bg-red-100';
      case 'billed': return 'text-purple-500 bg-purple-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const upcomingService = serviceHistory
    ?.filter((b) => ['pending', 'accepted'].includes(b.status))
    ?.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())[0];

  const primaryBike = bikes[0] || { brand: '-', model: '-', number: '-' };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6 text-gray-800 dark:text-white bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen relative">
      {/* Waiting Animation */}
      {waitingForApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl">
            <div className="w-16 h-16 border-4 border-t-green-600 border-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center -top-8 left-1/2 transform -translate-x-1/2">
              <svg className="w-8 h-8 text-green-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">Waiting for garage to accept...</p>
          </div>
        </div>
      )}

      {/* Profile Menu */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
        <button onClick={() => setShowMenu(!showMenu)} className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow">
          <User size={20} />
        </button>
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-xl rounded-2xl py-2 z-20 border border-gray-200 dark:border-gray-700">
            <button className="flex items-center w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-3" /> Home
            </button>
            <button className="flex items-center w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium" onClick={() => setView('dashboard')}>
              <Calculator className="w-4 h-4 mr-3" /> Dashboard
            </button>
            <button className="flex items-center w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium" onClick={() => setView('profile')}>
              <User className="w-4 h-4 mr-3" /> Profile
            </button>
            <button className="flex items-center w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium" onClick={() => setView('book')}>
              <Wrench className="w-4 h-4 mr-3" /> Book Service
            </button>
            <button
              className="flex items-center w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-500 text-sm font-medium"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut className="w-4 h-4 mr-3" /> Logout
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {['dashboard', 'profile', 'book'].map((tab) => (
          <button
            key={tab}
            className={`pb-2 px-3 sm:px-4 font-semibold text-xs sm:text-sm transition-colors ${view === tab ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setView(tab as 'dashboard' | 'profile' | 'book')}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {view === 'dashboard' && (
        <>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-3xl font-bold "><span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">Welcome, {customer?.name || user?.name || 'Guest'} </span>👋</h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Your Bike: <span className="font-medium">{primaryBike.brand} {primaryBike.model} ({primaryBike.number})</span>
            </p>
          </div>
          <div>
            <button
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-4 sm:px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all"
              onClick={() => setView('book')}
            >
              Book a Service
            </button>
          </div>

          {/* Upcoming Service Card */}
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-xl font-semibold mb-3 flex items-center"><Wrench className="w-4 h-4 mr-2 text-green-500" /> Upcoming Service</h2>
            {upcomingService ? (
              <div className="space-y-2 text-sm sm:text-base bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <p><strong>Date:</strong> {upcomingService.date ? new Date(upcomingService.date).toLocaleDateString() : '-'}</p>
                <p><strong>Time:</strong> {upcomingService.slot=="N/A"? <>{time}</>:""}</p>
                <p><strong>Type:</strong> {upcomingService.type || ''}</p>
                 <p>{upcomingService.garage=="N/A"?"":<><strong>Garage:</strong> {upcomingService.garage}</>}</p>
                <p><strong>Status:</strong> <span className={`${getStatusColor(upcomingService.status).replace('text-', 'text- bg-')} text-black rounded-full px-1 py-0.5`}>{upcomingService.status || '-'}</span></p>
                <div className="mt-3 flex flex-wrap gap-2 items-center justify-center sm:justify-start">
                  <a
                    href={upcomingService.location ? `https://www.google.com/maps?q=${upcomingService.location.lat},${upcomingService.location.lon}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm flex items-center shadow-md transition"
                  >
                    🗺️ Track Service
                  </a>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm shadow-md transition"
                    onClick={() => setShowCancelForm(upcomingService._id)}
                  >
                    Cancel
                  </button>
                </div>
                {showCancelForm === upcomingService._id && (
                  <div className="mt-4 p-4 border border-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <h3 className="text-base font-semibold mb-2">Cancel Service</h3>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm bg-white dark:bg-gray-700"
                      rows={3}
                      placeholder="Explain the reason..."
                    />
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm shadow-md transition"
                        onClick={() => handleCancelConfirm(upcomingService._id)}
                      >
                        Confirm Cancel
                      </button>
                      <button
                        className="bg-gray-300 hover:bg-gray-400 text-black dark:text-white px-4 py-2 rounded-full text-sm shadow-md transition"
                        onClick={() => setShowCancelForm(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No upcoming services.</p>
            )}
          </div>

          {/* Service History */}
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-xl font-semibold mb-3 flex items-center"><FileText className="w-4 h-4 mr-2 text-blue-500" /> Service History</h2>
            <div className="space-y-3">
              {serviceHistory?.map((entry) => (
                <div
                  key={entry._id}
                  className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md transition-shadow hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => setSelectedService(entry)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{entry.type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)} self-start sm:self-auto`}>
                      {entry.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-xs text-gray-700 dark:text-gray-300">
                    <p><strong>Bike:</strong> {entry.bike}</p>
                    <p>{entry.garage=="N/A"?"":(<><strong>Garage:</strong> {entry.garage}</>)}</p>
                    <div className="sm:col-span-2 grid grid-cols-1 gap-1">
                      <p><strong>Mechanic:</strong> {entry.mechanic?.name || '-'}</p>
                      <p className="text-gray-500 dark:text-gray-400"><strong>Contact:</strong> {entry.mechanic?.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {entry.status === 'billed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowBill(entry._id);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-colors w-full sm:w-auto justify-center"
                      >
                        <FileText size={12} /> View Bill
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {serviceHistory?.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No service history available.</p>
            )}
            {selectedService && (
              <div className="mt-4 p-4 border rounded-xl bg-gray-50 dark:bg-gray-700">
                <h3 className="font-semibold mb-2 text-sm sm:text-base flex items-center"><FileText className="w-4 h-4 mr-2 text-blue-500" /> Service Details</h3>
                <p><strong>Date:</strong> {selectedService.date ? new Date(selectedService.date).toLocaleDateString() : '-'}</p>
                <p><strong>Type:</strong> {selectedService.type}</p>
                <p><strong>Bike:</strong> {selectedService.bike}</p>
                <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedService.status)}`}>{selectedService.status}</span></p>
                <p><strong>Details:</strong> {selectedService?.details}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['confirmed', 'assigned', 'on-way', 'arrived', 'working'].includes(selectedService.status) && selectedService.location && (
                    <button
                      onClick={() => {
                        setCustomerLocation(selectedService.location);
                        setSelectedBookingForTracking(selectedService._id);
                        setTrackingOpen(true);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1"
                    >
                      🗺️ Track
                    </button>
                  )}
                  {selectedService.status === 'billed' && (
                    <button
                      onClick={() => handleShowBill(selectedService._id)}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1"
                    >
                      <FileText size={14} /> Show Bill
                    </button>
                  )}
                  <button 
                    className="text-red-500 hover:text-red-700 text-xs hover:underline" 
                    onClick={() => setSelectedService(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* My Bikes */}
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-xl font-semibold mb-3 flex items-center"><Calculator className="w-4 h-4 mr-2 text-green-500" /> My Bikes</h2>
            <ul className="space-y-2 text-sm sm:text-base">
              {bikes.map((bike, index) => (
                <li key={index} className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-medium">{bike.brand} {bike.model}</span> - <span className="text-gray-600 dark:text-gray-300 ml-2">({bike.number})</span>
                </li>
              ))}
            </ul>
            {bikes.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No bikes added.</p>
            )}
            <button className="mt-3 text-blue-500 hover:underline text-sm flex items-center gap-1" onClick={() => setView('book')}>
              <Wrench size={14} /> Add New Bike
            </button>
          </div>

          {/* Saved Addresses */}
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-xl font-semibold mb-3 flex items-center"><Home className="w-4 h-4 mr-2 text-green-500" /> Saved Addresses</h2>
            <ul className="space-y-2 text-sm sm:text-base">
              {savedAddresses.map((addr, index) => (
                <li key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <strong>{addr.label}:</strong> {addr.street}, {addr.city}, {addr.state} {addr.zipCode}
                </li>
              ))}
            </ul>
            {savedAddresses.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No addresses saved.</p>
            )}
            <button className="mt-3 text-blue-500 hover:underline text-sm" onClick={() => setView('profile')}>
              Manage Addresses
            </button>
          </div>
        </>
      )}

      {view === 'profile' && (
        <div className="space-y-4 sm:space-y-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><User className="w-6 h-6 text-green-500" /> Profile</h1>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <img
                  src={customer?.avatar || user?.avatar || 'https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=612x612&w=0&k=20&c=yBeyba0hUkh14_jgv1OKqIH0CCSWU_4ckRkAoy2p73o='}
                  alt={customer?.name || user?.name || 'User'}
                  className="w-16 h-16 sm:w-24 sm:h-24 rounded-full mx-auto mb-4 object-cover shadow-md"
                />
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{customer?.name || user?.name || '-'}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{customer?.email || user?.email || '-'}</p>
              </div>
            </div>
            <div className="sm:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-green-600 hover:text-green-700 text-sm font-medium transition"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 text-sm transition"
                    />
                  </div>
                ))}
              </div>
              {isEditing && (
                <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-4 flex-wrap">
                  <button
                    onClick={handleSaveProfile}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all text-sm shadow-md"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Home className="w-4 h-4 text-green-500" /> Manage Addresses</h3>
                <ul className="space-y-2 mb-4 text-sm sm:text-base">
                  {savedAddresses.map((addr, index) => (
                    <li key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <strong>{addr.label}:</strong> {addr.street}, {addr.city}, {addr.state}, {addr.zipCode}
                    </li>
                  ))}
                </ul>
                <div className="space-y-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['Bulding/Floor', 'street', 'city', 'state', 'zipCode'].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <input
                        type={field === 'zipCode' ? 'number' : 'text'}
                        value={newAddress[field as keyof typeof newAddress]}
                        onChange={(e) => setNewAddress({ ...newAddress, [field]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-green-500 focus:border-green-500 transition"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddAddress}
                  className="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all text-sm shadow-md"
                >
                  Add Address
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'book' && (
        <div className="space-y-4 sm:space-y-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2"><Wrench className="w-6 h-6 text-green-500" /> Book Service</h1>
          <form
            onSubmit={handleBookingSubmit}
            className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-4 sm:p-6 w-full max-w-md mx-auto border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-400 mb-4 sm:mb-6 text-center">Book Your Bike Service</h2>
            {[
              { label: 'Full Name', name: 'name', type: 'text', placeholder: 'e.g. Rajesh Kumar' },
              { label: 'Mobile Number', name: 'mobile', type: 'tel', placeholder: 'e.g. 9876543210', pattern: '[0-9]{10}', maxLength: 10 },
              { label: 'Brand Name', name: 'brand', type: 'text', placeholder: 'e.g. Honda, Yamaha' },
              { label: 'Model', name: 'model', type: 'text', placeholder: 'e.g. Splendor Plus' },
              { label: 'Bike Number', name: 'bikeNumber', type: 'text', placeholder: 'e.g. MH12 AB 1234' },
            ].map((field) => (
              <div className="mb-4" key={field.name}>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={bookingForm[field.name as keyof typeof bookingForm]}
                  onChange={handleBookingChange}
                  placeholder={field.placeholder}
                  pattern={field.pattern}
                  maxLength={field.maxLength}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500 text-sm transition"
                  required
                />
              </div>
            ))}
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Service Type</label>
              <select
                name="serviceType"
                value={bookingForm.serviceType}
                onChange={handleBookingChange}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500 text-sm transition"
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Slot</label>
                  <select
                    name="slot"
                    value={bookingForm.slot}
                    onChange={handleBookingChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500 text-sm transition"
                    required
                  >
                    <option value="">Select Slot</option>
                    <option value="morning">Morning (9 AM - 12 PM)</option>
                    <option value="afternoon">Afternoon (1 PM - 4 PM)</option>
                    <option value="evening">Evening (5 PM - 8 PM)</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Date</label>
                  <input
                    type="date"
                    name="date"
                    value={bookingForm.date}
                    onChange={handleBookingChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500 text-sm transition"
                    required
                  />
                </div>
              </>
            )}
            <div className="mb-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-green-700 text-xs sm:text-sm transition shadow-md"
                >
                  📍 Use My Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavedAddresses(!showSavedAddresses)}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs sm:text-sm transition"
                >
                  Saved
                </button>
              </div>
              {showSavedAddresses && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 space-y-1 mb-2 max-h-32 overflow-y-auto">
                  {savedAddresses.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 text-xs">No saved addresses</div>
                  ) : (
                    savedAddresses.map((addr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSavedAddressSelect(`${addr.street}, ${addr.city}, ${addr.state}, ${addr.zipCode}`, addr.lat, addr.lon)}
                        className="block w-full text-left hover:text-green-600 text-xs dark:text-white p-1 rounded transition"
                      >
                        {addr.label}: {addr.street}, {addr.city}
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
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500 text-sm transition"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Description</label>
              <textarea
                name="description"
                value={bookingForm.description}
                onChange={handleBookingChange}
                rows={3}
                placeholder="Describe the issue with your bike (e.g. engine noise, oil leak)"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500 text-sm transition"
                required
              />
            </div>
            <button
              type="submit"
              disabled={bookingMutation.isPending}
              className="w-full mt-4 sm:mt-6 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all disabled:bg-gray-400 text-sm shadow-lg"
            >
              {bookingMutation.isPending ? 'Submitting...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      )}

      {/* Live Tracking Component */}
      {trackingOpen && selectedBookingForTracking && customerLocation && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Live Tracking</h4>
              <button 
                onClick={() => {
                  setTrackingOpen(false);
                  setSelectedBookingForTracking(null);
                  setCustomerLocation(null);
                  setMechanicLocation(null);
                }} 
                className="text-red-500 text-sm"
              >
                Close
              </button>
            </div>
            <div className="h-64 rounded-lg overflow-hidden">
              <MapContainer
                center={[customerLocation.lat, customerLocation.lon]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <TrackingMap 
                  customerLocation={customerLocation} 
                  mechanicLocation={mechanicLocation || undefined} 
                />
              </MapContainer>
            </div>
            {mechanicLocation && (
              <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                Mechanic at: {mechanicLocation.lat.toFixed(4)}, {mechanicLocation.lon.toFixed(4)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;