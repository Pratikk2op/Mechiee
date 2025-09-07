import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { Send, MessageCircle, Clock, HelpCircle, X, Users, List } from 'lucide-react';
import toast from 'react-hot-toast';

interface ChatBoxProps {
  bookingId?: string;
  isOpen?: boolean;
  onClose?: () => void;
  showAdminSupport?: boolean;
  onMinimize?: () => void;
  isMinimized?: boolean;
  initialChatType?: 'booking' | 'admin_support';
  initialRoomId?: string;
}

interface AdminSupportForm {
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  supportType: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  bookingId,
  isOpen = true,
  onClose,
  showAdminSupport = true,
  onMinimize,
  isMinimized = false,
  initialChatType = 'booking',
  initialRoomId,
}) => {
  const { user } = useAuth();
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
  const [showAdminSupportModal, setShowAdminSupportModal] = useState(false);
  const [adminSupportForm, setAdminSupportForm] = useState<AdminSupportForm>({
    category: 'technical_issue',
    description: '',
    priority: 'medium',
    supportType: 'general',
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        toast.error('Failed to initialize chat');
      }
    };

    initializeChat();

    // Cleanup on unmount or close
    return () => {
      if (currentChat) {
        leaveChat();
      }
    };
  }, [user, isOpen, initialRoomId, bookingId, loadChatRooms, joinChat, leaveChat]);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    if (!currentChat || isTyping) return;

   

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
   
    }, 3000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentChat, isTyping,]);

  // Send message with booking-related detection
  const handleSendMessage = async () => {
    if (!message.trim() || sendingMessage || !currentChat) return;

    try {
      // Check if message is booking-related
      const isBookingRelated = /\b(booking|appointment|service|repair|bike|order|issue with booking)\b/i.test(message);
      const bookingIdMatch = message.match(/\b(booking\s*id|order\s*id|appointment\s*id):?\s*([0-9a-f]{24})\b/i);
      const extractedBookingId = bookingIdMatch ? bookingIdMatch[2] : null;

      // Send message via ChatContext
      await sendChatMessage(message.trim(), 'text');

      // Emit custom event for booking-related messages
      if (isBookingRelated && currentChat.type !== 'booking' && user?.role !== 'admin') {
        // Notify backend to route to garage/mechanic
        // Note: The backend handles routing to garage/mechanic based on bookingId or general query
        // This is handled in server.js via 'sendMessage' event
      }

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

  // Create admin support chat
  const handleCreateAdminSupport = async () => {
    if (!adminSupportForm.description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    try {
      const result = await createAdminSupportChat(adminSupportForm);
      setShowAdminSupportModal(false);
      setAdminSupportForm({
        category: 'technical_issue',
        description: '',
        priority: 'medium',
        supportType: 'general',
      });
      toast.success('Admin support chat created');
      await joinChat(result.roomId); // Auto-join the new support chat
    } catch (error) {
      console.error('Failed to create admin support chat:', error);
      toast.error('Failed to create admin support chat');
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
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg relative"
          title="Expand Chat"
        >
          <MessageCircle size={24} />
          {chatRooms.some((room) => room.unreadCount > 0) && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {chatRooms.reduce((total, room) => total + room.unreadCount, 0)}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 w-96 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle size={20} />
            <div>
              <h3 className="font-semibold">
                {currentChat?.type === 'admin_support'
                  ? 'Admin Support'
                  : currentChat?.bookingId
                  ? `Booking #${currentChat.bookingId.slice(-6)}`
                  : 'Chat'}
              </h3>
              {currentChat && (
                <p className="text-sm opacity-90">
                  {getCurrentParticipants().length} participant
                  {getCurrentParticipants().length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Chat List Button */}
            <button
              onClick={() => setShowChatList(true)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Chat List"
            >
              <List size={16} />
              {chatRooms.some((room) => room.unreadCount > 0) && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {chatRooms.reduce((total, room) => total + room.unreadCount, 0)}
                </div>
              )}
            </button>
            {/* Admin Support Button */}
            {showAdminSupport && user?.role !== 'admin' && (
              <button
                onClick={() => setShowAdminSupportModal(true)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Create Admin Support"
              >
                <HelpCircle size={16} />
              </button>
            )}
            {/* Minimize Button */}
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Minimize"
              >
                —
              </button>
            )}
            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Current Chat Status */}
        {currentChat?.type === 'admin_support' && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentChat.supportStatus === 'open'
                      ? 'bg-green-100 text-green-800'
                      : currentChat.supportStatus === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {currentChat.supportStatus || 'open'}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentChat.priority === 'urgent'
                      ? 'bg-red-100 text-red-800'
                      : currentChat.priority === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : currentChat.priority === 'medium'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {currentChat.priority || 'medium'} priority
                </span>
              </div>
              <span className="text-gray-600 dark:text-gray-300">
                {currentChat.category?.replace('_', ' ')}
              </span>
            </div>
          </div>
        )}

        {/* Participants */}
        {getCurrentParticipants().length > 0 && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2 text-sm">
              <Users size={16} className="text-gray-500" />
              <span className="text-gray-600 dark:text-gray-300">Participants:</span>
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
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300">Loading chat...</span>
            </div>
          ) : !currentChat ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p>No chat selected</p>
              <p className="text-sm">Select a chat from the list or create a new one</p>
              <button
                onClick={() => setShowChatList(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Chats
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg._id || index}
                className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.senderId === user?.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
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
              <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg">
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
                  <span className="text-sm ml-2">
                    {typingUsers.map((u) => u.userName).join(', ')} typing...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-600">
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
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={sendingMessage || !currentChat}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendingMessage || !currentChat}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Send size={16} />
              <span className="hidden sm:inline">{sendingMessage ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chat List Modal */}
      {showChatList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Your Chats</h3>
              <button
                onClick={() => setShowChatList(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : chatRooms.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No chats available</div>
              ) : (
                chatRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleSwitchChat(room.id)}
                    className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                      currentChat?.id === room.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {room.type === 'admin_support'
                              ? 'Admin Support'
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
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
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

      {/* Admin Support Modal */}
      {showAdminSupportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Create Admin Support</h3>
              <button
                onClick={() => setShowAdminSupportModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={adminSupportForm.category}
                  onChange={(e) =>
                    setAdminSupportForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="technical_issue">Technical Issue</option>
                  <option value="booking_issue">Booking Issue</option>
                  <option value="payment_issue">Payment Issue</option>
                  <option value="service_quality">Service Quality</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select
                  value={adminSupportForm.priority}
                  onChange={(e) =>
                    setAdminSupportForm((prev) => ({ ...prev, priority: e.target.value as any }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={adminSupportForm.description}
                  onChange={(e) =>
                    setAdminSupportForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Please describe your issue or question..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={4}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAdminSupportModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAdminSupport}
                  disabled={!adminSupportForm.description.trim() || loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Support'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBox;