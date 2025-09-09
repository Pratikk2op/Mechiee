import React, { createContext, useContext, useEffect, useState } from 'react';
import socket from '../socket';

export interface Notification {
  id?: string;
  
  type: string;
  message: string;
  payload?: any;
  read: boolean;
  timestamp: string | Date;
}

const NotificationContext = createContext<{
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}>({
  notifications: [],
  markAsRead: () => {},
  markAllAsRead: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handler = (notif: Notification) => {
      setNotifications(prev => [
        {
          ...notif,
          id: notif.id || `${notif.type}-${Date.now()}`,
          read: false,
        },
        ...prev,
      ]);
      // Optionally trigger a toast here
    };
    socket.on('notification', handler);
    return () => {
      socket.off('notification', handler);
    };
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
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