import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URI = import.meta.env.VITE_API_URL;

interface Customer {
  _id: string;
  name: string;
  email: string;
  savedAddresses: { label: string; value: string }[];
}

interface Booking {
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

interface CustomerContextType {
  customer: Customer | null;
  bookings: Booking[];
  bikes: Bike[];
  savedAddresses: { label: string; value: string }[];
  loading: boolean;
  cancelBooking: (bookingId: string, reason: string) => Promise<void>;
  reloadCustomerData: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const useCustomerContext = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomerContext must be used within a CustomerProvider');
  }
  return context;
};

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  const reloadCustomerData = async () => {
    setLoading(true);
    try {
      // Fetch customer data
      const customerRes = await axios.get(`${BASE_URI}/api/customers/me`, { withCredentials: true });
      const customerData = customerRes.data;
      setCustomer(customerData);

      // Fetch bookings
      const bookingsRes = await axios.get(`${BASE_URI}/api/bookings`, { withCredentials: true });
      const bookingsData: Booking[] = bookingsRes.data;
      setBookings(bookingsData);

      // Extract unique bikes from bookings
      const uniqueBikes = Array.from(
        new Map(
          bookingsData
            .filter((b) => typeof b.bike === 'string' && b.bike)
            .map((b) => [b.bike, { brand: '', model: '', number: b.bike }])
        ).values()
      );
      setBikes(uniqueBikes);

      // Set saved addresses
      setSavedAddresses(customerData.savedAddresses || []);
    } catch (err) {
      console.error('[CustomerContext] Error fetching customer data:', err);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string, reason: string) => {
    try {
      await axios.post(
        `${BASE_URI}/api/bookings/${bookingId}/cancel`,
        { reason },
        { withCredentials: true }
      );
      toast.success('Booking cancelled successfully');
      await reloadCustomerData();
    } catch (err: any) {
      console.error('[CustomerContext] Error cancelling booking:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  useEffect(() => {
    const newSocket = io(BASE_URI, { withCredentials: true });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[CustomerContext] Socket connected:', newSocket.id);
      if (customer?._id) {
        newSocket.emit('register', { userId: customer._id });
      }
    });

    newSocket.on('newBookingRequest', (data) => {
      console.log('[CustomerContext] Received newBookingRequest:', data);
      reloadCustomerData();
    });

    newSocket.on('bookingAccepted', (data) => {
      console.log('[CustomerContext] Received bookingAccepted:', data);
      toast.success(`Booking ${data.bookingId} accepted by garage`);
      reloadCustomerData();
    });

    newSocket.on('bookingCancelled', (data) => {
      console.log('[CustomerContext] Received bookingCancelled:', data);
      toast.success(`Booking ${data.bookingId} cancelled`);
      reloadCustomerData();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [customer?._id]);

  useEffect(() => {
    reloadCustomerData();
  }, []);

  return (
    <CustomerContext.Provider
      value={{
        customer,
        bookings,
        bikes,
        savedAddresses,
        loading,
        cancelBooking,
        reloadCustomerData,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};