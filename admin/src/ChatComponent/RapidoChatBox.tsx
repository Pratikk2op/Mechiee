import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../socket';
import { Send, MessageCircle, X, Users, Phone, MapPin, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface RapidoChatBoxProps {
  bookingId?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  initialChatType?: 'booking' | 'admin_support';
  initialRoomId?: string;
}

const RapidoChatBox: React.FC<RapidoChatBoxProps> = ({
  bookingId,
  isOpen = true,
  onClose,
  onMinimize,
  isMinimized = false,
  initialChatType = 'booking',
  initialRoomId,
}) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const {
    chatRooms,
    currentChat,
    messages,
    loadChatRooms,
    joinChat,
    leaveChat,
    sendMessage: sendChatMessage,
    isTyping,
    typingUsers,
    createAdminSupportChat,
    loading,
    sendingMessage,
    error,
  } = useChat();

  const [message, setMessage] = useState<string>('');
  const [showChatList, setShowChatList] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check socket connection
  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    if (socket) {
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      setIsConnected(socket.connected);
    }

    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      }
    };
  }, [socket]);

  // Initialize chat when component mounts
  useEffect(() => {
    const initializeChat = async () => {
      if (!user || !isOpen) return;

      try {
        // Load chat rooms
        await loadChatRooms();

        // Join initial chat if provided
        if (initialRoomId) {
          await joinChat(initialRoomId);
        } else if (bookingId) {
          const bookingRoomId = `booking_${bookingId}`;
          await joinChat(bookingRoomId);
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
    };

    initializeChat();

    // Cleanup on unmount or close
    return () => {
      if (currentChat) {
        leaveChat();
      }
    };
  }, [user?.id, isOpen, initialRoomId, bookingId]); // Removed function dependencies to prevent infinite loops

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    if (!currentChat || isTyping) return;

    // Start typing indicator
    if (socket) {
      socket.emit('typing', { 
        room: currentChat.id, 
        userId: user?.id 
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indicator
      if (socket) {
        socket.emit('stopTyping', { 
          room: currentChat.id, 
          userId: user?.id 
        });
      }
    }, 3000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentChat, isTyping, socket, user?.id]);

  // Send message
  const handleSendMessage = async () => {
    if (!message.trim() || sendingMessage || !currentChat) return;

    try {
      await sendChatMessage(message.trim(), 'text');
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Switch between chats
  const handleSwitchChat = async (roomId: string) => {
    try {
      await joinChat(roomId);
      setShowChatList(false);
    } catch (error) {
      console.error('Failed to switch chat:', error);
      toast.error('Failed to switch chat');
    }
  };

  // Get current participants
  const getCurrentParticipants = () => {
    if (!currentChat) return [];
    const room = chatRooms.find((room) => room.id === currentChat.id);
    return room?.participants || [];
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onMinimize}
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg relative"
          title="Expand Chat"
        >
          <MessageCircle size={24} />
          {chatRooms.some((room: any) => room.unreadCount > 0) && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {chatRooms.reduce((total: number, room: any) => total + room.unreadCount, 0)}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
        {/* Header - Rapido Style */}
        <div className="bg-green-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <MessageCircle size={16} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {currentChat?.type === 'admin_support'
                  ? 'Support Chat'
                  : currentChat?.bookingId
                  ? `Booking #${currentChat.bookingId.slice(-6)}`
                  : 'Chat'}
              </h3>
              <div className="flex items-center space-x-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Chat List Button */}
            <button
              onClick={() => setShowChatList(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Chat List"
            >
              <Users size={16} />
            </button>
            {/* Minimize Button */}
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Minimize"
              >
                —
              </button>
            )}
            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Participants Info */}
        {getCurrentParticipants().length > 0 && (
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-2 text-sm">
              <Users size={14} className="text-gray-500" />
              <span className="text-gray-600">Participants:</span>
              <div className="flex flex-wrap gap-1">
                {getCurrentParticipants().map((participant) => (
                  <span
                    key={participant.userId}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      participant.role === 'customer'
                        ? 'bg-blue-100 text-blue-800'
                        : participant.role === 'garage'
                        ? 'bg-green-100 text-green-800'
                        : participant.role === 'mechanic'
                        ? 'bg-purple-100 text-purple-800'
                        : participant.role === 'admin'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {participant.name} {participant.isOnline && <span className="text-green-500">●</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!currentChat ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chat selected</p>
              <p className="text-xs text-gray-400">Select a chat from the list</p>
              <button
                onClick={() => setShowChatList(true)}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                View Chats
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-gray-400">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg._id || index}
                className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.senderId === user?.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="text-xs font-medium mb-1 opacity-70">
                    {msg.senderId === user?.id ? 'You' : msg.senderName || 'Unknown'} ({msg.senderRole})
                  </div>
                  <div className="text-sm">{msg.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                  <span className="text-xs ml-2">
                    {typingUsers.map((u) => u.userName).join(', ')} typing...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Rapido Style */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder={currentChat ? 'Type your message...' : 'Select a chat first...'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              disabled={sendingMessage || !currentChat}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendingMessage || !currentChat}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Chat List Modal */}
      {showChatList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-80 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Your Chats</h3>
              <button
                onClick={() => setShowChatList(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {chatRooms.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No chats available</div>
              ) : (
                chatRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleSwitchChat(room.id)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      currentChat?.id === room.id ? 'bg-green-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">
                            {room.type === 'admin_support'
                              ? 'Support Chat'
                              : room.bookingId
                              ? `Booking #${room.bookingId.slice(-6)}`
                              : 'Chat'}
                          </span>
                          {room.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {room.unreadCount}
                            </span>
                          )}
                        </div>
                        {room.lastMessage && (
                          <p className="text-xs text-gray-600 truncate">
                            {room.lastMessage.content}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(room.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RapidoChatBox;
