// PendingOrders.tsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  User,
  Bike,
  Calendar,
 
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBooking } from "../contexts/BookingContext";
import toast from "react-hot-toast";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import previewSound from "../assets/preview.mp3";

// ----- Types -----
interface PendingBooking {
  _id: string;
  name?: string;
  
  mobile?: string;
  serviceType: string;
  brand: string;
  model: string;
  bikeNumber?: string;
  address?: string;
  description?: string;
  scheduledDate: string;
  slot?: string;
  lat?: number;
  lon?: number;
  createdAt?: string;
  totalAmount?: number;
  status?: string;
}

interface PendingOrdersProps {
  onBookingAccepted?: (bookingId: string) => void;
  onBookingRejected?: (bookingId: string) => void;
}

type BookingAcceptedPayload = { bookingId: string; garageName?: string };
type BookingRejectedPayload = { bookingId: string; garageName?: string };
type NewBookingPayload = PendingBooking;

// ----- Component -----
const PendingOrders: React.FC<PendingOrdersProps> = ({
  onBookingAccepted,
  onBookingRejected,
}) => {
  const { user } = useAuth();
  const { mechanicList = [], reloadData } = useBooking();
  const queryClient = useQueryClient();

  const [selectedMechanics, setSelectedMechanics] = useState<
    Record<string, string>
  >({});
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Audio and notification refs
  
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevBookingIds = useRef<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // --- Helper: Show notification ----
  const showNotification = (booking: PendingBooking) => {
    console.log("Attempting to show notification for booking:", booking._id);
    
    if (!("Notification" in window)) {
      console.error("Browser doesn't support notifications");
      return;
    }

    if (Notification.permission !== "granted") {
      console.warn("Notification permission not granted:", Notification.permission);
      return;
    }

    try {
      const bodyParts: string[] = [];
      bodyParts.push(`Customer: ${booking?.name ?? booking.name ?? "Unknown"}`);
      if (booking.serviceType) bodyParts.push(`Service: ${booking.serviceType}`);
      bodyParts.push(`Bike: ${booking.brand} ${booking.model}`);
      if (booking.bikeNumber) bodyParts.push(`Number: ${booking.bikeNumber}`);
      if (booking.mobile || booking.mobile) {
        bodyParts.push(`Phone: ${booking.mobile}`);
      }

      console.log("Creating notification with body:", bodyParts.join(" | "));

      const notification = new Notification("🔔 New Booking Request!", {
        body: bodyParts.join("\n"),
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `booking-${booking._id}`,
        requireInteraction: true,
        silent: false,
       
        data: { bookingId: booking._id },
       
      });

      notification.onclick = (ev) => {
        ev.preventDefault();
        console.log("Notification clicked");
        window.focus();
        const bookingElement = document.getElementById(`booking-${booking._id}`);
        if (bookingElement) {
          bookingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        notification.close();
      };

      notification.onerror = (err) => {
        console.error("Notification error:", err);
      };

      setTimeout(() => {
        try {
          notification.close();
        } catch {}
      }, 60000); // Close after 1 minute

      console.log("Notification created successfully");
    } catch (err) {
      console.error("Failed to create notification:", err);
    }
  };

  // --- Helper: Play sound ----
  const playNotificationSound = async (): Promise<void> => {
    console.log("Attempting to play sound, tab hidden:", document.hidden);
    
    try {
      if (!htmlAudioRef.current) {
        htmlAudioRef.current = new Audio(previewSound);
        htmlAudioRef.current.volume = 1.0;
      }
      htmlAudioRef.current.currentTime = 0;
      const playPromise = htmlAudioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => console.log("Sound played successfully"))
          .catch((err) => console.warn("Sound play failed:", err));
      }
    } catch (err) {
      console.warn("Sound playback error:", err);
    }
  };

  // --- Request notification permission ----
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Your browser doesn't support notifications");
      return;
    }

  

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
     
        return
       
      } else {
        toast.error("Notification permission denied. Please enable in browser settings.");
      }
    } catch (err) {
      console.error("Permission request failed:", err);
      toast.error("Failed to request notification permission");
    }
  };

  // --- Initial setup ----
  useEffect(() => {
    if (user?.role === "garage" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
      
      // Auto-request permission on mount if default
      if (Notification.permission === "default") {
        setTimeout(() => {
          requestNotificationPermission();
        }, 1000);
      }
    }
  }, [user]);

  // --- Preload audio ----
  useEffect(() => {
    const audio = new Audio(previewSound);
    audio.preload = "auto";
    audio.volume = 1.0;
    htmlAudioRef.current = audio;
    requestNotificationPermission();

    // User interaction handler to unlock audio
    const unlockAudio = () => {
      if (htmlAudioRef.current) {
        htmlAudioRef.current.play()
          .then(() => {
            htmlAudioRef.current!.pause();
            htmlAudioRef.current!.currentTime = 0;
            console.log("Audio unlocked");
          })
          .catch(() => {});
      }
    };

    const events = ["click", "touchstart", "keydown"];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
    

  }, []);

  // --- React Query: fetch pending bookings ----
  const fetchPendingBookings = async (): Promise<PendingBooking[]> => {
    try {
      const res = await axios.get<PendingBooking[]>(
        `${import.meta.env.VITE_API_URL}/api/bookings/pending`,
        { withCredentials: true }
      );
      console.log("Fetched bookings:", res.data?.length || 0);
      return res.data ?? [];
    } catch (err: any) {
      console.error("fetch pending bookings error:", err);
      toast.error(err?.response?.data?.message || "Failed to fetch pending bookings");
      return [];
    }
  };

  const { data: pendingBookings = [], isLoading: loading } = useQuery<
    PendingBooking[],
    unknown
  >({
    queryKey: ["bookings"],
    queryFn: fetchPendingBookings,
    enabled: user?.role === "garage",
    refetchInterval: 10000, // Poll every 10s
    refetchIntervalInBackground: true, // CRITICAL: Keep polling when tab is inactive
  });

  // --- SOCKET.IO real-time listeners ---
  useEffect(() => {
    if (user?.role !== "garage") return;

    console.log("Setting up socket connection...");
    const socket: Socket = io(import.meta.env.VITE_API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
    });

    socket.on("bookingAccepted", (data: BookingAcceptedPayload) => {
      console.log("Booking accepted event:", data.bookingId);
      queryClient.setQueryData<PendingBooking[] | undefined>(
        ["bookings"],
        (old) => (old ? old.filter((b) => b._id !== data.bookingId) : [])
      );
      toast.success(`Booking accepted by ${data.garageName ?? "garage"}`);
    });

    socket.on("bookingRejected", (data: BookingRejectedPayload) => {
      console.log("Booking rejected event:", data.bookingId);
      queryClient.setQueryData<PendingBooking[] | undefined>(
        ["bookings"],
        (old) => (old ? old.filter((b) => b._id !== data.bookingId) : [])
      );
      toast.error(`Booking rejected by ${data.garageName ?? "garage"}`);
    });

    socket.on("newBookingRequest", (data: NewBookingPayload) => {
      console.log("🆕 New booking request received via socket:", data._id);
      if (data.status !== "pending") return;
      
      queryClient.setQueryData<PendingBooking[] | undefined>(
        ["bookings"],
        (old) => {
          const exists = old?.some(b => b._id === data._id);
          if (exists) return old;
          return old ? [data, ...old] : [data];
        }
      );

      // Immediately show notification and play sound
      showNotification(data);
      playNotificationSound();
    });

    return () => {
      console.log("Cleaning up socket connection");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, queryClient]);

  // --- Detect new bookings from polling and notify ----
  useEffect(() => {
    if (!pendingBookings || pendingBookings.length === 0) {
      prevBookingIds.current = [];
      return;
    }

    const currentIds = pendingBookings.map(b => b._id);
    const newBookingIds = currentIds.filter(id => !prevBookingIds.current.includes(id));

    if (newBookingIds.length > 0 && prevBookingIds.current.length > 0) {
      console.log(`🆕 ${newBookingIds.length} new booking(s) detected via polling`);
      
      newBookingIds.forEach(id => {
        const booking = pendingBookings.find(b => b._id === id);
        if (booking) {
          showNotification(booking);
          playNotificationSound();
        }
      });
    }

    prevBookingIds.current = currentIds;
  }, [pendingBookings]);

  // --- Page Visibility API - log when tab becomes visible/hidden ----
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log("Tab visibility changed:", document.hidden ? "HIDDEN" : "VISIBLE");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // --- Accept / Reject handlers -----
  const handleAcceptBooking = async (bookingId: string) => {
    const mechanicId = selectedMechanics[bookingId];
    if (!mechanicId) {
      toast.error("Please select a mechanic first");
      return;
    }
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/bookings/accept`,
        { bookingId, mechanicId },
        { withCredentials: true }
      );
      toast.success("Booking accepted successfully!");
      setSelectedMechanics((prev) => {
        const { [bookingId]: _, ...rest } = prev;
        return rest;
      });
      onBookingAccepted?.(bookingId);
      reloadData?.();
    } catch (err: any) {
      console.error("accept error:", err);
      toast.error(err?.response?.data?.message || "Failed to accept booking");
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/bookings/reject`,
        { bookingId, reason: rejectReason || "No reason provided" },
        { withCredentials: true }
      );
      toast.success("Booking rejected successfully!");
      setRejectReason("");
      setShowRejectModal(null);
      onBookingRejected?.(bookingId);
    } catch (err: any) {
      console.error("reject error:", err);
      toast.error(err?.response?.data?.message || "Failed to reject booking");
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  // ----- Render UI -----
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-orange-500" />
          Pending Orders
          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {pendingBookings.length}
          </span>
        </h2>

        {/* Notification toggle button */}
       
      </div>

      {/* Notification status banner */}
    

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
                id={`booking-${booking._id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* header */}
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
                        {booking.bikeNumber ?? "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* details */}
                <div className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {booking.name ?? booking.name ?? "Customer"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span>{booking.mobile ?? booking.mobile ?? "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Location</p>
                      <p className="text-gray-900 dark:text-white">{booking.address ?? "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(booking.scheduledDate)}{booking.slot ? ` at ${booking.slot}` : ""}
                      </p>
                    </div>
                  </div>

                  {booking.description && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description</p>
                      <p className="text-gray-900 dark:text-white">{booking.description}</p>
                    </div>    
                  )}

                  {booking.totalAmount && (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Amount</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">₹{booking.totalAmount}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <select
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        value={selectedMechanics[booking._id] ?? ""}
                        onChange={(e) =>
                          setSelectedMechanics((prev) => ({ ...prev, [booking._id]: e.target.value }))
                        }
                      >
                        <option value="">Select Mechanic</option>
                        {mechanicList.map((m: any) => (
                          <option key={m._id} value={m._id}>
                            {m.name} ({m.skill ?? "N/A"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => handleAcceptBooking(booking._id)}
                      disabled={!selectedMechanics[booking._id]}
                      className="flex items-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Accept
                    </button>

                    <button
                      onClick={() => setShowRejectModal(booking._id)}
                      className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* REJECT MODAL */}
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
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4 resize-none focus:ring-2 focus:ring-red-500"
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