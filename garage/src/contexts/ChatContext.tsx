import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../socket';
import type { Message } from '../types';
import toast from 'react-hot-toast';

// Cookie utility functions
const cookies = {
  getItem: (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue || null;
    }
    return null;
  },
  setItem: (name: string, value: string, days: number = 7): void => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  },
  removeItem: (name: string): void => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  },
};

// API service
const API_BASE = 'http://localhost:5000/api';

const apiService = {
  get: async (url: string) => {
    const token = cookies.getItem('authToken');
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
  post: async (url: string, data: any) => {
    const token = cookies.getItem('authToken');
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
  put: async (url: string, data: any) => {
    const token = cookies.getItem('authToken');
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
};

// Chat API aligned with backend routes
export const chatAPI = {
  getChatRooms: () => apiService.get('/chat/rooms'),
  getChatMessages: (roomId: string) => {
    if (roomId.startsWith('booking_')) {
      const bookingId = roomId.replace('booking_', '');
      return apiService.get(`/chat/booking_${bookingId}/messages`);
    }
    return apiService.get(`/chat/${roomId}/messages`);
  },
  sendMessage: (roomId: string, content: string, messageType: string = 'text') =>
    apiService.post('/chat/send-message', { roomId, content, messageType }),
  createAdminSupportChat: (data: {
    category: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    supportType?: string;
  }) => apiService.post('/chat/admin-support', data),
  updateSupportChatStatus: (
    chatId: string,
    data: {
      supportStatus?: 'open' | 'in_progress' | 'resolved' | 'closed';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assignedAdmin?: string;
    }
  ) => apiService.put(`/chat/admin-support/${chatId}/status`, data),
  getSupportStats: () => apiService.get('/chat/admin-support/stats'),
  getMySupportChats: () => apiService.get('/chat/my-support-chats'),
};

// Types
interface Participant {
  userId: string;
  name: string;
  role: 'customer' | 'garage' | 'mechanic' | 'admin';
  avatar?: string;
  isOnline: boolean;
}

interface ChatRoom {
  id: string;
  type: 'booking' | 'admin_support';
  bookingId?: string;
  chatId?: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  supportStatus?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
}

interface ChatContextType {
  chatRooms: ChatRoom[];
  currentChat: ChatRoom | null;
  messages: Message[];
  loadChatRooms: () => Promise<void>;
  joinChat: (roomId: string) => Promise<void>;
  leaveChat: () => void;
  sendMessage: (
    content: string,
    messageType?: 'text' | 'file' | 'location'
  ) => Promise<void>;
  createAdminSupportChat: (data: {
    category: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    supportType?: 'technical' | 'billing' | 'general' | 'complaint' | 'feedback';
  }) => Promise<{ chatId: string; roomId: string }>;
  getSupportStats: () => Promise<{
    totalChats: number;
    openChats: number;
    inProgressChats: number;
    statusBreakdown: Array<{ _id: string; count: number }>;
  }>;
  isTyping: boolean;
  typingUsers: Array<{ userId: string; userName: string; userRole: string }>;
  loading: boolean;
  sendingMessage: boolean;
  error: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  // State
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; userName: string; userRole: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize chat
  useEffect(() => {
    if (user && isConnected) {
      // backend doesn't handle 'register', but keeping it is harmless
      socket.emit('register', { userId: user.id, role: user.role });
      loadChatRooms();
    }
  }, [user, isConnected, socket]);

  // Socket event listeners (MATCH backend: receiveMessage, typing, stopTyping)
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReceiveMessage = (data: any) => {
      const roomId = data.roomId || currentChat?.id;
      if (!roomId) return;
      if (currentChat?.id === roomId) {
        setMessages(prev => [...prev, data]);
      }
      setChatRooms(prev => prev.map(room => room.id === roomId ? {
              ...room,
        lastMessage: data,
        unreadCount: currentChat?.id === roomId ? room.unreadCount : room.unreadCount + 1,
        updatedAt: new Date().toISOString()
      } : room));
      if (data.senderId !== user?.id && currentChat?.id !== roomId) {
        toast.success(`New message from ${data.senderName || 'User'}`);
      }
    };

    const handleTyping = ({ roomId, room, userId, userRole, userName }: any) => {
      const r = roomId || room;
      if (userId !== user?.id && currentChat?.id === r) {
        setTypingUsers(prev => (prev.some(u => u.userId === userId) ? prev : [...prev, { userId, userName, userRole }]));
      }
    };
    const handleStopTyping = ({ roomId, room, userId }: any) => {
      const r = roomId || room;
      if (currentChat?.id === r) {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('userTyping', handleTyping);
    socket.on('userStoppedTyping', handleStopTyping);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('userTyping', handleTyping);
      socket.off('userStoppedTyping', handleStopTyping);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [socket, isConnected, user, currentChat]);

  // Load chat rooms
  const loadChatRooms = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const rooms = await chatAPI.getChatRooms();
      setChatRooms(
        rooms.map((room: any) => ({
          id: room.id,
          type: room.type,
          bookingId: room.bookingId,
          chatId: room.chatId,
          participants: room.participants,
          lastMessage: room.lastMessage
            ? { ...room.lastMessage, timestamp: new Date(room.lastMessage.timestamp) }
            : undefined,
          unreadCount: room.unreadCount || 0,
          supportStatus: room.supportStatus,
          priority: room.priority,
          category: room.category,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          title: room.title,
        }))
      );
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load chat rooms';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to load chat rooms:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Join a chat
  const joinChat = useCallback(async (roomId: string) => {
      if (!user || !socket) return;
    const room = chatRooms.find(r => r.id === roomId);
    if (!room) {
      toast.error('Chat room not found');
      return;
    }

      setLoading(true);
      setError(null);

      try {
        if (currentChat) {
          socket.emit('leaveRoom', { roomId: currentChat.id });
        }

        socket.emit('joinRoom', {
          room: roomId,
          userId: user.id,
          senderRole: user.role,
        garageId: (user as any).garageId || null
        });

        const response = await chatAPI.getChatMessages(roomId);
      const { messages: chatMessages = [] } = response;

      setCurrentChat(room);
      setMessages(chatMessages);
        setTypingUsers([]);

      setChatRooms(prev => prev.map(r => r.id === roomId ? { ...r, unreadCount: 0 } : r));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to join chat';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Failed to join chat:', error);
      } finally {
        setLoading(false);
      }
  }, [user, socket, chatRooms, currentChat]);

  // Leave chat
  const leaveChat = useCallback(() => {
    if (!socket || !currentChat) return;

    socket.emit('leaveRoom', { roomId: currentChat.id });
    setCurrentChat(null);
    setMessages([]);
    setTypingUsers([]);
    setError(null);
  }, [socket, currentChat]);

  // Send message (MATCH backend: { room, content, sender, senderRole, timestamp })
  const sendMessage = useCallback(async (content: string, messageType: 'text' | 'file' | 'location' = 'text') => {
      if (!user || !currentChat || !content.trim() || !socket) return;

      setSendingMessage(true);
      setError(null);

      try {
        socket.emit('sendMessage', {
        room: currentChat.id,
          content: content.trim(),
        sender: user.id,
          senderRole: user.role,
        timestamp: new Date().toISOString(),
        messageType
        });
        await chatAPI.sendMessage(currentChat.id, content.trim(), messageType);
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to send message';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Failed to send message:', error);
      } finally {
        setSendingMessage(false);
      }
  }, [user, currentChat, socket]);

  // Create admin support chat
  const createAdminSupportChat = useCallback(
    async (data: {
      category: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      supportType?: 'technical' | 'billing' | 'general' | 'complaint' | 'feedback';
    }) => {
      if (!user) throw new Error('User not authenticated');

      setError(null);

      try {
        const response = await chatAPI.createAdminSupportChat(data);
        if (response.success) {
          await loadChatRooms();
          await joinChat(response.data.roomId);
          toast.success('Support chat created successfully');
          return {
            chatId: response.data.chatId,
            roomId: response.data.roomId,
          };
        } else {
          throw new Error(response.error || 'Failed to create support chat');
        }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to create admin support chat';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Failed to create admin support chat:', error);
        throw error;
      }
    },
    [user, loadChatRooms, joinChat]
  );

  // Get support stats
  const getSupportStats = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      const stats = await chatAPI.getSupportStats();
      return stats;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch support stats';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to fetch support stats:', error);
      throw error;
    }
  }, [user]);

  // Typing indicators (MATCH backend: emit 'typing' / 'stopTyping' with { room, userId })
  const startTyping = useCallback(() => {
    if (!socket || !currentChat || isTyping || !user) return;

    setIsTyping(true);
    socket.emit('typing', {
      room: currentChat.id,          // <-- backend expects 'room'
      userId: user.id,
      // backend will enrich name/role from socket context and emit back
    });
  }, [socket, currentChat, isTyping, user]);

  const stopTyping = useCallback(() => {
    if (!socket || !currentChat || !isTyping || !user) return;

    setIsTyping(false);
    socket.emit('stopTyping', {
      room: currentChat.id,          // <-- backend expects 'room'
      userId: user.id,
    });
  }, [socket, currentChat, isTyping, user]);

  useEffect(() => {
    if (!socket) return;
    // expose if needed
    const typingContext = { startTyping, stopTyping };
    void typingContext;
  }, [startTyping, stopTyping, socket]);

  const value: ChatContextType = {
    chatRooms,
    currentChat,
    messages,
    loadChatRooms,
    joinChat,
    leaveChat,
    sendMessage,
    createAdminSupportChat,
    getSupportStats,
    isTyping,
    typingUsers,
    loading,
    sendingMessage,
    error,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
