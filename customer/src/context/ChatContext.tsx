import React, {
  createContext,
  useContext,
  useState,
  useEffect,
 
  useCallback
} from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from '../socket';
import type {ReactNode} from "react"
import type{ Message } from '../types';
import toast from 'react-hot-toast';

// Cookie utility functions (currently unused)
// const cookies = {
//   getItem: (name: string): string | null => {
//     const value = `; ${document.cookie}`;
//     const parts = value.split(`; ${name}=`);
//     if (parts.length === 2) {
//       const cookieValue = parts.pop()?.split(';').shift();
//       return cookieValue || null;
//     }
//     return null;
//   },
//   setItem: (name: string, value: string, days: number = 7): void => {
//     const expires = new Date();
//     expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
//     document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
//   },
//   removeItem: (name: string): void => {
//     document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
//   }
// };

// API service - using cookies for token storage
const API_BASE = 'https://backend-3lsi.onrender.com/api';

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
  }, [user?.id, isConnected]); // Only depend on user.id and isConnected

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReceiveMessage = (message: any) => {
      const roomId = (message as any).roomId || currentChat?.id;
      if (!roomId) return;

      if (currentChat?.id === roomId) {
        setMessages(prev => [...prev, message]);
      }

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

      if (message.senderId !== user?.id && currentChat?.id !== roomId) {
        toast.success(`New message from ${message.senderName || 'User'}`);
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
      setChatRooms([]); // Set empty array on error to prevent infinite loading
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
      // If room doesn't exist in chatRooms, try to create it
      console.log(`Chat room ${roomId} not found in loaded rooms, attempting to create...`);
      
      // For booking rooms, try to create the chat session
      if (roomId.startsWith('booking_')) {
        try {
          setLoading(true);
          setError(null);

          // Leave current chat if any
          if (currentChat) {
            socket.emit('leaveRoom', { roomId: currentChat.id });
          }

          // Join new chat room (this will create the session on the server)
          if (user?.id && user?.role) {
            socket.emit('joinRoom', {
              room: roomId,
              userId: user.id,
              senderRole: user.role,
              garageId: user.garageId || null
            });
          } else {
            console.error('Cannot join room: user data missing', { userId: user?.id, role: user?.role });
            return;
          }

          // Load messages for the chat
          const response = await chatAPI.getChatMessages(roomId);
          const { messages: chatMessages = [] } = response;

          // Create a temporary room object for the current chat
          const tempRoom = {
            id: roomId,
            type: 'booking' as const,
            bookingId: roomId.replace('booking_', ''),
            participants: [],
            lastMessage: null,
            unreadCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          setCurrentChat(tempRoom);
          setMessages(chatMessages);
          setTypingUsers([]);

          // Reload chat rooms to get the newly created room
          await loadChatRooms();

        } catch (error: any) {
          const blocked = typeof error?.message === 'string' && /Booking chat available after acceptance/i.test(error.message);
          if (blocked) {
            // Try support_<bookingId> room for pre-acceptance
            const supportRoom = roomId.replace('booking_', 'support_');
            socket.emit('joinRoom', {
              room: supportRoom,
              userId: user.id,
              senderRole: user.role,
            });
            const response2 = await chatAPI.getChatMessages(supportRoom);
            const { messages: supportMsgs = [] } = response2;
            const tempRoom2 = {
              id: supportRoom,
              type: 'support' as const,
              bookingId: roomId.replace('booking_', ''),
              participants: [],
              lastMessage: null,
              unreadCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setCurrentChat(tempRoom2);
            setMessages(supportMsgs);
            setTypingUsers([]);
            await loadChatRooms();
            toast.success('Opened support chat with admin for this booking');
          } else {
            console.error('Failed to create chat room:', error);
          }
        } finally {
          setLoading(false);
        }
        return;
      } else {
        toast.error('Chat room not found');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Leave current chat if any
      if (currentChat) {
        socket.emit('leaveRoom', { roomId: currentChat.id });
      }

      // Join new chat room
      if (user?.id && user?.role) {
        socket.emit('joinRoom', {
          room: roomId,
          userId: user.id,
          senderRole: user.role,
          garageId: user.garageId || null
        });
      } else {
        console.error('Cannot join room: user data missing', { userId: user?.id, role: user?.role });
        return;
      }

      // Load messages for the chat
      const response = await chatAPI.getChatMessages(roomId);
      const { messages: chatMessages = [] } = response;

      setCurrentChat(room);
      setMessages(chatMessages);
      setTypingUsers([]);

      // Mark room as read (reset unread count)
      setChatRooms(prev => prev.map(r => 
        r.id === roomId ? { ...r, unreadCount: 0 } : r
      ));

    } catch (error: any) {
      const blocked = typeof error?.message === 'string' && /Booking chat available after acceptance/i.test(error.message);
      const errorMessage = blocked ? 'Booking chat opens after garage accepts. Use Admin Support for now.' : (error.message || 'Failed to join chat');
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
    socket.emit('typing', { 
      room: currentChat.id, 
      userId: user?.id 
    });
  }, [socket, currentChat, isTyping, user?.id]);

  const stopTyping = useCallback(() => {
    if (!socket || !currentChat || !isTyping) return;
    
    setIsTyping(false);
    socket.emit('stopTyping', { 
      room: currentChat.id, 
      userId: user?.id 
    });
  }, [socket, currentChat, isTyping, user?.id]);

  // Expose typing functions for use in components
  useEffect(() => {
    // You can attach these to window for global access if needed
    // window.chatTyping = { startTyping, stopTyping };
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