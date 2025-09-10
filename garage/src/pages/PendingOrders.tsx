import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, MapPin, Phone, User, Bike, Calendar} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBooking } from '../contexts/BookingContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { io } from 'socket.io-client';

interface PendingBooking {
  _id: string;
  customerName: string;
  customer?: {
    name: string;
    phone: string;
  };
  mobile?: string;
  serviceType: string;
  brand: string;
  model: string;
  bikeNumber: string;
  address: string;
  description?: string;
  scheduledDate: string;
  slot: string;
  lat: number;
  lon: number;
  createdAt: string;
  totalAmount?: number;
}

interface PendingOrdersProps {
  onBookingAccepted?: (bookingId: string) => void;
  onBookingRejected?: (bookingId: string) => void;
}

const PendingOrders: React.FC<PendingOrdersProps> = ({ 
  onBookingAccepted, 
  onBookingRejected 
}) => {
  const { user } = useAuth();
  const { mechanicList, reloadData } = useBooking();
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>('');
  const [, setSelectedBookingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // Fetch pending bookings
  const fetchPendingBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings/pending`, {
        withCredentials: true
      });
      setPendingBookings(response.data);
    } catch (error: any) {
      console.error('Error fetching pending bookings:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch pending bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'garage') {
      fetchPendingBookings();
    }
  }, [user]);

  // Real-time updates for booking acceptance/rejection
  useEffect(() => {
    if (user?.role !== 'garage') return;

    const socket = io(import.meta.env.VITE_API_URL, {
      withCredentials: true
    });

    socket.on('bookingAccepted', (data: { bookingId: string; acceptedBy: string; garageName: string }) => {
      setPendingBookings(prev => prev.filter(booking => booking._id !== data.bookingId));
      toast.success(`Booking accepted by ${data.garageName}!`);
    });

    socket.on('bookingRejected', (data: { bookingId: string; rejectedBy: string; garageName: string; reason?: string }) => {
      setPendingBookings(prev => prev.filter(booking => booking._id !== data.bookingId));
      toast.success(`Booking rejected by ${data.garageName}`);
    });

    socket.on('newBookingRequest', (data: any) => {
      setPendingBookings(prev => [data, ...prev]);
      toast.success('New booking received!');
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Handle accept booking
  const handleAcceptBooking = async (bookingId: string) => {
    if (!selectedMechanicId) {
      toast.error('Please select a mechanic first');
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings/accept`, {
        bookingId,
        mechanicId: selectedMechanicId
      }, {
        withCredentials: true
      });

      toast.success('Booking accepted successfully!');
      setSelectedMechanicId('');
      setSelectedBookingId(null);
      onBookingAccepted?.(bookingId);
      fetchPendingBookings(); // Refresh the list
      reloadData(); // Refresh main booking list
    } catch (error: any) {
      console.error('Error accepting booking:', error);
      toast.error(error.response?.data?.message || 'Failed to accept booking');
    }
  };

  // Handle reject booking
  const handleRejectBooking = async (bookingId: string) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings/reject`, {
        bookingId,
        reason: rejectReason || 'No reason provided'
      }, {
        withCredentials: true
      });

      toast.success('Booking rejected successfully!');
      setRejectReason('');
      setShowRejectModal(null);
      onBookingRejected?.(bookingId);
      fetchPendingBookings(); // Refresh the list
    } catch (error: any) {
      console.error('Error rejecting booking:', error);
      toast.error(error.response?.data?.message || 'Failed to reject booking');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-orange-500" />
          Pending Orders
          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {pendingBookings.length}
          </span>
        </h2>
      </div>

      <AnimatePresence>
        {pendingBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Pending Orders
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              New booking requests will appear here in real-time.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map((booking, index) => (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Booking Header */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                        <Bike className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {booking.serviceType}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {booking.brand} {booking.model}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Bike Number</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {booking.bikeNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="p-4 space-y-4">
                  {/* Customer Info */}
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {booking.customerName || booking.customer?.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span>{booking?.mobile || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                      <p className="text-gray-900 dark:text-white">{booking.address}</p>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(booking.scheduledDate)} at {booking.slot}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {booking.description && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description</p>
                      <p className="text-gray-900 dark:text-white">{booking.description}</p>
                    </div>
                  )}

                  {/* Amount */}
                  {booking.totalAmount && (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Amount</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ₹{booking.totalAmount}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Mechanic Selection */}
                    <div className="flex-1">
                                             <select
                         className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         value={selectedMechanicId}
                         onChange={(e) => setSelectedMechanicId(e.target.value)}
                       >
                         <option value="">Select Mechanic</option>
                         {mechanicList.map((mechanic) => (
                           <option key={mechanic._id} value={mechanic._id}>
                             {mechanic.name} ({mechanic.skill || 'N/A'})
                           </option>
                         ))}
                       </select>
                    </div>

                    {/* Accept Button */}
                    <button
                      onClick={() => handleAcceptBooking(booking._id)}
                      disabled={!selectedMechanicId}
                      className="flex items-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept
                    </button>

                    {/* Reject Button */}
                    <button
                      onClick={() => setShowRejectModal(booking._id)}
                      className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>

                    {/* Chat Button */}
                  
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Reject Booking
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4 resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectBooking(showRejectModal)}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingOrders; 