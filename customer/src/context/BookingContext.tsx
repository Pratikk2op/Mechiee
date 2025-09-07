import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type {ReactNode} from "react"

// Base URI for API and Socket
const BASE_URI = 'http://localhost:5000';

// Types (adjust as necessary)
interface Booking {
  _id: string;
  customerName: string;
  serviceType: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  totalAmount?: number;
  createdAt?: string;
  garage?: string | { id: string; name: string; phone: string };
  mechanic?: string | { id: string; name: string; phone: string };
  customerId?: string;
  bikeNumber?: string;
  brand?: string;
  model?: string;
  slot?: string;
  address?: string;
  description?: string;
  scheduledDate?: string;
  [key: string]: any;
}

interface Mechanic {
  _id: string;
  name: string;
  email: string;
  phone: string;
  skill?: string;
  lat?: number;
  lng?: number;
}

interface BookingContextType {
  bookingList: Booking[];
  mechanicList: Mechanic[];
  loading: boolean;
  acceptBooking: (bookingId: string, mechanicId: string) => Promise<void>;
  deleteMechanic: (mechanicId: string) => Promise<void>;
  pendingBookingList: Booking[];
  confirmedBookingList: Booking[];
  totalRevenue: number;
  reloadData: () => Promise<void>;
  joinBookingRoom: (bookingId: string) => void;
  leaveBookingRoom: (bookingId: string) => void;
  socket: Socket | null;
}

const BookingContext = createContext<BookingContextType>(
  {} as BookingContextType
);

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

interface BookingProviderProps {
  children: ReactNode;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const [bookingList, setBookingList] = useState<Booking[]>([]);
  const [mechanicList, setMechanicList] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Reload bookings and mechanics data
  const reloadData = useCallback(async () => {
    if (!user) {
      setBookingList([]);
      setMechanicList([]);
      return;
    }

    try {
      setLoading(true);
      const [bookingsRes, mechanicsRes] = await Promise.all([
        axios.get(`${BASE_URI}/api/bookings`, {
          withCredentials: true,
          timeout: 10000,
        }),
        axios.get(`${BASE_URI}/api/users/mechanics`, {
          withCredentials: true,
          timeout: 10000,
        }),
      ]);

      const bookings = Array.isArray(bookingsRes.data)
        ? bookingsRes.data
        : [];
      bookings.sort(
        (a, b) =>
          new Date(b.createdAt || '').getTime() -
          new Date(a.createdAt || '').getTime()
      );
      setBookingList(bookings);

      setMechanicList(
        Array.isArray(mechanicsRes.data) ? mechanicsRes.data : []
      );
    } catch (err: any) {
      console.error(
        'Data load error:',
        err.response?.data?.message || err.message
      );
      // Optionally show toast error here
      // toast.error(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Notification helper function
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

  // Accept a booking by assigning a mechanic
  const acceptBooking = async (
    bookingId: string,
    mechanicId: string
  ): Promise<void> => {
    try {
      await axios.post(
        `${BASE_URI}/api/bookings/accept`,
        { bookingId, mechanicId },
        { withCredentials: true, timeout: 5000 }
      );
      toast.success('Booking accepted and mechanic assigned');
      notifySystem(
        'Booking Accepted',
        'Mechanic assigned successfully.'
      );
      await reloadData();
    } catch (err: any) {
      console.error(
        'Accept booking error:',
        err.response?.data?.message || err.message
      );
      toast.error(
        err.response?.data?.message || 'Failed to accept booking'
      );
    }
  };

  // Delete a mechanic by ID
  const deleteMechanic = async (mechanicId: string): Promise<void> => {
    try {
      await axios.delete(`${BASE_URI}/api/users/mechanics/${mechanicId}`, {
        withCredentials: true,
        timeout: 5000,
      });
      toast.success('Mechanic removed successfully');
      notifySystem('Mechanic Removed', 'Mechanic deleted successfully.');
      await reloadData();
    } catch (err: any) {
      console.error(
        'Delete mechanic error:',
        err.response?.data?.message || err.message
      );
      toast.error(
        err.response?.data?.message || 'Failed to delete mechanic'
      );
    }
  };

  // Derived data
  const totalRevenue = bookingList
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const pendingBookingList = bookingList.filter((b) => b.status === 'pending');
  const confirmedBookingList = bookingList.filter(
    (b) => b.status === 'accepted'
  );

  // Memoized join booking room function
  const joinBookingRoom = useCallback(
    (bookingId: string) => {
      if (socket && bookingId) {
        socket.emit('joinBooking', bookingId);
        socket.emit('joinChatRoom', bookingId);
        socket.emit('joinLocationRoom', bookingId);
        console.log(`Joined booking rooms for ${bookingId}`);
      }
    },
    [socket]
  );

  // Memoized leave booking room function
  const leaveBookingRoom = useCallback(
    (bookingId: string) => {
      if (socket && bookingId) {
        socket.emit('leaveBooking', bookingId);
        socket.emit('leaveChatRoom', bookingId);
        socket.emit('leaveLocationRoom', bookingId);
        console.log(`Left booking rooms for ${bookingId}`);
      }
    },
    [socket]
  );

  // Setup Socket.IO client and event listeners, runs once per user session
  useEffect(() => {
    if (!user) {
      // Clear data and disconnect socket if no user
      setBookingList([]);
      setMechanicList([]);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    reloadData().catch(console.error);

    const newSocket = io(BASE_URI, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected');

      // Register user info
      newSocket.emit('register', { userId: user._id, role: user.role });

      // Garage owners join their garage room
      if (user.role === 'garage' && user.garageId) {
        newSocket.emit('joinRoom', user.garageId.toString());
        newSocket.emit('joinGarageRoom');
        console.log(`Garage user joined room: ${user.garageId}`);
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      toast.error('Failed to connect to real-time updates');
    });

    // New booking request (garage owners)
    newSocket.on('newBookingRequest', (data: Booking) => {
      toast.success('New booking received!');
      notifySystem('New Booking', `Booking from ${data.customerName} received.`);
      setBookingList((prev) => {
        const duplicate = prev.find((b) => b._id === data._id);
        if (duplicate) return prev;
        return [data, ...prev].sort(
          (a, b) =>
            new Date(b.createdAt || '').getTime() -
            new Date(a.createdAt || '').getTime()
        );
      });
    });

    // Booking accepted by another garage (remove from pending list)
    newSocket.on('bookingAccepted', (data: { bookingId: string; acceptedBy: string; garageName: string }) => {
      toast.success(`Booking accepted by ${data.garageName}!`);
      notifySystem('Booking Accepted', `Booking was accepted by ${data.garageName}.`);
      setBookingList((prev) => prev.filter((b) => b._id !== data.bookingId));
    });

    // Booking rejected by another garage
    newSocket.on('bookingRejected', (data: { bookingId: string; rejectedBy: string; garageName: string; reason?: string }) => {
      toast.error(`Booking rejected by ${data.garageName}`);
      setBookingList((prev) => prev.filter((b) => b._id !== data.bookingId));
    });

    // Booking accepted event for customer & others
    newSocket.on(
      'bookingAccepted',
      (data: {
        bookingId: string;
        garageId: string;
        mechanicId: string;
        garage?: any;
        mechanic?: any;
        message?: string;
      }) => {
        if (data.message) {
          toast.success(data.message);
          notifySystem('Booking Accepted', data.message);
        }
        setBookingList((prev) =>
          prev
            .map((b) =>
              b._id === data.bookingId
                ? {
                    ...b,
                    status: 'accepted' as Booking['status'],
                    garage: data.garage || b.garage,
                    mechanic: data.mechanic || b.mechanic,
                  }
                : b
            )
            .sort(
              (a, b) =>
                new Date(b.createdAt || '').getTime() -
                new Date(a.createdAt || '').getTime()
            )
        );
      }
    );

    // Assigned booking event (mechanic)
    newSocket.on(
      'assignedBooking',
      (data: { bookingId: string; bookingDetails: any; message: string }) => {
        toast.success(data.message);
        notifySystem('New Assignment', data.message);
        setBookingList((prev) =>
          prev
            .map((b) =>
              b._id === data.bookingId
                ? { ...b, ...data.bookingDetails, status: 'accepted' }
                : b
            )
            .sort(
              (a, b) =>
                new Date(b.createdAt || '').getTime() -
                new Date(a.createdAt || '').getTime()
            )
        );
      }
    );

    // Booking closed event (remove from list)
    newSocket.on(
      'bookingClosed',
      (data: { bookingId: string; acceptingGarageId: string; message: string }) => {
        toast.success(data.message);
        notifySystem('Booking Closed', data.message);
        setBookingList((prev) =>
          prev
            .filter((b) => b._id !== data.bookingId)
            .sort(
              (a, b) =>
                new Date(b.createdAt || '').getTime() -
                new Date(a.createdAt || '').getTime()
            )
        );
      }
    );

    // New Order acceptance event (additional real-time handling)
    newSocket.on('newOrder', (orderData: Booking) => {
      toast.success('New order accepted!');
      notifySystem('Order Accepted', `Order from ${orderData.customerName} accepted.`);
      setBookingList((prev) => {
        if (prev.find((b) => b._id === orderData._id)) return prev;
        return [orderData, ...prev];
      });
    });

    // Live location updates
    newSocket.on(
      'locationUpdate',
      ({ bookingId, userId, lat, lng }) => {
        console.log(
          `Location update: booking=${bookingId} user=${userId} lat=${lat} lng=${lng}`
        );
        // You can update location state here if required
      }
    );

    // Chat messages received
    newSocket.on(
      'receiveMessage',
      ({ roomId, senderId, message, timestamp }) => {
        console.log(`Chat message on room ${roomId} from ${senderId}: ${message}`);
        // Update chat state/UI here if needed
      }
    );

    return () => {
      newSocket.disconnect();
      setSocket(null);
      console.log('Socket disconnected on cleanup');
    };
  }, [user, reloadData]);

  // Join booking rooms when bookingList changes or socket changes
  useEffect(() => {
    if (!socket || !user) return;

    bookingList.forEach((booking) => {
      if (
        (user.role === 'customer' && booking.customerId === user._id) ||
        (user.role === 'garage' &&
          booking.garage &&
          ((booking.garage as any)?._id === user.garageId ||
            booking.garage === user.garageId)) ||
        (user.role === 'mechanic' &&
          booking.mechanic &&
          ((booking.mechanic as any)?._id === user._id || booking.mechanic === user._id))
      ) {
        joinBookingRoom(booking._id);
      }
    });
  }, [bookingList, socket, user, joinBookingRoom]);

  return (
    <BookingContext.Provider
      value={{
        bookingList,
        mechanicList,
        loading,
        acceptBooking,
        deleteMechanic,
        pendingBookingList,
        confirmedBookingList,
        totalRevenue,
        reloadData,
        joinBookingRoom,
        leaveBookingRoom,
        socket,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};
