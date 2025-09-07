import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  
  useCallback
} from 'react';
import type {ReactNode} from "react"
import { useAuth } from './AuthContext';
import { useSocket } from '../socket';
import type{ Message, ChatSession } from '../types';
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
  }
};

// API service - using cookies for token storage
const API_BASE = 'http://localhost:5000/api';

const apiService = {
  get: async (url: string) => {

      
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        
        'Content-Type': 'application/json'
      },
        credentials: 'include'
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
  
  post: async (url: string, data: any) => {
  

    const response = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: {
         
    
        'Content-Type': 'application/json'
      },
       credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },

  put: async (url: string, data: any) => {
    
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: {
       
        'Content-Type': 'application/json'
      },
       credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }
};

// Enhanced Chat API based on your backend routes
export const chatAPI = {
  // Get user's chat rooms
  getChatRooms: () => apiService.get('/chat/rooms'),
  
  // Get chat messages for a specific room
  getChatMessages: (roomId: string) => apiService.get(`/chat/${roomId}/messages`),
  
  // Send message to a room
  sendMessage: (roomId: string, content: string, messageType: string = 'text') =>
    apiService.post('/chat/send-message', { roomId, content, messageType }),
  
  // Create admin support chat
  createAdminSupportChat: (data: {
    category: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    supportType?: string;
  }) => apiService.post('/chat/admin-support', data),
  
  // Update support chat status (admin only)
  updateSupportChatStatus: (chatId: string, data: {
    supportStatus?: string;
    priority?: string;
    assignedAdmin?: string;
  }) => apiService.put(`/chat/admin-support/${chatId}/status`, data),
  
  // Get support chat statistics (admin only)
  getSupportStats: () => apiService.get('/chat/admin-support/stats'),
  
  // Get user's support chats
  getMySupportChats: () => apiService.get('/chat/my-support-chats')
};

interface ChatRoom {
  id: string;
  type: 'booking' | 'admin_support';
  bookingId?: string;
  chatId?: string;
  participants: Array<{
    userId: string;
    name: string;
    role: string;
    avatar?: string;
    isOnline: boolean;
  }>;
  lastMessage?: any;
  unreadCount: number;
  supportStatus?: string;
  priority?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatContextType {
  // Chat sessions
  chatRooms: ChatRoom[];
  currentChat: ChatRoom | null;
  messages: Message[];
  
  // Chat actions
  loadChatRooms: () => Promise<void>;
  joinChat: (roomId: string) => Promise<void>;
  leaveChat: () => void;
  sendMessage: (content: string, messageType?: 'text' | 'file' | 'location') => Promise<void>;
  
  // Chat state
  isTyping: boolean;
  typingUsers: Array<{ userId: string; userName: string; userRole: string }>;
  
  // Admin support
  createAdminSupportChat: (data: {
    category: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    supportType?: string;
  }) => Promise<{ chatId: string; roomId: string }>;
  
  // Loading states
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
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string; userRole: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize chat when user changes
  useEffect(() => {
    if (user && isConnected) {
      // Register user with socket
      socket.emit('register', { userId: user.id, role: user.role });
      
      // Load user's chat rooms
      loadChatRooms();
    }
  }, [user, isConnected]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Message received
    const handleReceiveMessage = (data: { roomId: string } & Message) => {
      const { roomId, ...message } = data;
      
      // Add message to current chat if it matches
      if (currentChat?.id === roomId) {
        setMessages(prev => [...prev, message]);
      }
      
      // Update chat room with new message
      setChatRooms(prev => prev.map(room => {
        if (room.id === roomId) {
          return {
            ...room,
            lastMessage: message,
            unreadCount: currentChat?.id === roomId ? room.unreadCount : room.unreadCount + 1,
            updatedAt: new Date().toISOString()
          };
        }
        return room;
      }));

      // Show notification for new messages not from current user
      if (message.senderId !== user?.id && currentChat?.id !== roomId) {
        toast.success(`New message from ${message.senderName}`);
      }
    };

    // User typing
    const handleUserTyping = ({ userId, userName, userRole }: { userId: string; userName: string; userRole: string }) => {
      if (userId !== user?.id) {
        setTypingUsers(prev => {
          const existing = prev.find(u => u.userId === userId);
          if (existing) return prev;
          return [...prev, { userId, userName, userRole }];
        });
      }
    };

    // User stopped typing
    const handleUserStoppedTyping = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    };

    // User joined chat
    const handleUserJoined = ({ userId, userName, userRole }: { userId: string; userName: string; userRole: string }) => {
      if (userId !== user?.id) {
        toast.success(`${userName} joined the chat`);
      }
    };

    // User left chat
    const handleUserLeft = ({ userId, userName }: { userId: string; userName: string }) => {
      if (userId !== user?.id) {
        toast.success(`${userName} left the chat`);
      }
    };

    // Error handling
    const handleError = (error: { message: string; details?: string }) => {
      toast.error(error.message);
      console.error('Chat error:', error);
      setError(error.message);
    };

    // Socket event listeners
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    socket.on('error', handleError);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
      socket.off('error', handleError);
    };
  }, [socket, isConnected, user, currentChat]);

  // Load user's chat rooms
  const loadChatRooms = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const rooms = await chatAPI.getChatRooms();
      setChatRooms(rooms || []);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load chat rooms';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to load chat rooms:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Join an existing chat
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
      // Leave current chat if any
      if (currentChat) {
        socket.emit('leaveRoom', { roomId: currentChat.id });
      }

      // Join new chat room
      socket.emit('joinRoom', {
        room: roomId,
        userId: user.id,
        senderRole: user.role,
        garageId: user.garageId
      });

      // Load messages for the chat
      const response = await chatAPI.getChatMessages(roomId);
      const { messages: chatMessages = [], chatInfo } = response;

      setCurrentChat(room);
      setMessages(chatMessages);
      setTypingUsers([]);

      // Mark room as read (reset unread count)
      setChatRooms(prev => prev.map(r => 
        r.id === roomId ? { ...r, unreadCount: 0 } : r
      ));

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to join chat';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to join chat:', error);
    } finally {
      setLoading(false);
    }
  }, [user, socket, chatRooms, currentChat]);

  // Leave current chat
  const leaveChat = useCallback(() => {
    if (!socket || !currentChat) return;
    
    socket.emit('leaveRoom', { roomId: currentChat.id });
    setCurrentChat(null);
    setMessages([]);
    setTypingUsers([]);
    setError(null);
  }, [socket, currentChat]);

  // Send a message
  const sendMessage = useCallback(async (content: string, messageType: 'text' | 'file' | 'location' = 'text') => {
    if (!user || !currentChat || !content.trim()) return;
    
    setSendingMessage(true);
    setError(null);

    try {
      await chatAPI.sendMessage(currentChat.id, content.trim(), messageType);
      
      // The message will be received via socket and added to state
      // No need to optimistically update here since the backend handles it
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send message';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  }, [user, currentChat]);

  // Create admin support chat
  const createAdminSupportChat = useCallback(async (data: {
    category: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    supportType?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');
    
    setError(null);

    try {
      const response = await chatAPI.createAdminSupportChat(data);
      
      if (response.success) {
        // Reload chat rooms to include the new support chat
        await loadChatRooms();
        
        // Automatically join the new support chat
        await joinChat(response.data.roomId);
        
        toast.success('Admin support chat created successfully');
        
        return {
          chatId: response.data.chatId,
          roomId: response.data.roomId
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
  }, [user, loadChatRooms, joinChat]);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (!socket || !currentChat || isTyping) return;
    
    setIsTyping(true);
    socket.emit('typing', { roomId: currentChat.id });
  }, [socket, currentChat, isTyping]);

  const stopTyping = useCallback(() => {
    if (!socket || !currentChat || !isTyping) return;
    
    setIsTyping(false);
    socket.emit('stopTyping', { roomId: currentChat.id });
  }, [socket, currentChat, isTyping]);

  // Expose typing functions for use in components
  useEffect(() => {
    const chatContext = {
      startTyping,
      stopTyping
    };
    
    // You can attach these to window for global access if needed
    // window.chatTyping = chatContext;
  }, [startTyping, stopTyping]);

  const value: ChatContextType = {
    chatRooms,
    currentChat,
    messages,
    loadChatRooms,
    joinChat,
    leaveChat,
    sendMessage,
    isTyping,
    typingUsers,
    createAdminSupportChat,
    loading,
    sendingMessage,
    error
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};