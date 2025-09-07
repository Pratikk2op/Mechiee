import React, { createContext, useContext, useEffect, useState } from 'react';
import socket from '../socket';

// Define the Notification interface
export interface Notification {
  id: string; // Made id required to avoid undefined checks
  type: string;
  message: string;
  payload?: unknown; // Changed to unknown for stricter typing
  read: boolean;
  timestamp: string | Date;
}

// Define the NotificationContext type
interface NotificationContextType {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

// Create the context with proper typing
const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  markAsRead: () => {},
  markAllAsRead: () => {},
});

// Custom hook to use the NotificationContext
export const useNotification = () => useContext(NotificationContext);

// NotificationProvider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Type the socket event handler
    const handler = (notif: Omit<Notification, 'id' | 'read'> & { id?: string }) => {
      setNotifications(prev => [
        {
          ...notif,
          id: notif.id ?? `${notif.type}-${Date.now()}`, // Use nullish coalescing for safer id handling
          read: false,
        },
        ...prev,
      ]);
      // Optionally trigger a toast here
    };

    socket.on('notification', handler);

    // Cleanup on unmount
    return () => {
      socket.off('notification', handler);
    };
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <NotificationContext.Provider value={{ notifications, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};