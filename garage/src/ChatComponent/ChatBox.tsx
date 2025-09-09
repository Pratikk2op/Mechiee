import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { Send, MessageCircle, HelpCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ChatBoxProps {
  bookingId?: string;
  isOpen?: boolean;
  onClose?: () => void;
  showAdminSupport?: boolean;
  onMinimize?: () => void;
  isMinimized?: boolean;
  initialChatType?: 'booking' | 'admin_support' | 'general';
  initialRoomId?: string;
}

interface AdminSupportForm {
  category: 'technical_issue' | 'booking_issue' | 'payment_issue' | 'service_quality' | 'other';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  supportType: 'technical' | 'billing' | 'general' | 'complaint' | 'feedback';
}

interface ChatRoom {
  id: string;
  type: 'booking' | 'admin_support';
  bookingId?: string;
  chatId?: string;
  participants: { userId: string; name: string; role: string; isOnline: boolean }[];
  lastMessage?: { content: string; timestamp: Date };
  unreadCount: number;
  supportStatus?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
}

interface Message {
  _id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: Date;
  readBy: { userId: string; readAt: Date }[];
  messageType?: string;
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
  const { socket, joinChat, leaveChat, sendMessage, createAdminSupportChat, isTyping, typingUsers, loading, sendingMessage, error } = useChat();
  const [message, setMessage] = useState<string>('');
  const [showAdminSupportModal, setShowAdminSupportModal] = useState(false);
  const [adminSupportForm, setAdminSupportForm] = useState<AdminSupportForm>({
    category: 'technical_issue',
    description: '',
    priority: 'medium',
    supportType: 'general',
  });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [typingUsers]);

  // Initialize chat
  useEffect(() => {
    if (!user || !isOpen || !socket) return;

    const initializeChat = async () => {
      try {
        let roomId = initialRoomId;
        if (!roomId && bookingId && initialChatType === 'booking') {
          roomId = `booking_${bookingId}`;
        }
        if (roomId) {
          await joinChat(roomId);
        }
      } catch (err: any) {
        console.error('Failed to initialize chat:', err);
        toast.error('Failed to initialize chat');
      }
    };

    initializeChat();

    return () => {
      leaveChat();
    };
  }, [user, isOpen, bookingId, initialRoomId, initialChatType, socket, joinChat, leaveChat]);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    if (!socket || isTyping || !user) return;

    socket.emit('typing', {
      room: initialRoomId || `booking_${bookingId}`,
      userId: user.id,
      userName: user.name || 'Unknown',
      userRole: user.role,
    });






    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', {
        room: initialRoomId || `booking_${bookingId}`,
        userId: user.id,
      });
    }, 3000);
  }, [socket, isTyping, user, initialRoomId, bookingId]);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || sendingMessage || !user) return;

    try {

      await sendMessage(message.trim(), 'text');
      setMessage('');
    } catch (err: any) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    }
  }, [message, sendingMessage, sendMessage, user]);

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
      await createAdminSupportChat(adminSupportForm);
      setShowAdminSupportModal(false);
      setAdminSupportForm({
        category: 'technical_issue',
        description: '',
        priority: 'medium',
        supportType: 'general',
      });
    } catch (err: any) {
      console.error('Failed to create admin support chat:', err);
      toast.error('Failed to create admin support chat');
    }
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onMinimize}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-transform duration-300 hover:scale-105"
          title="Expand Chat"
          aria-label="Expand chat window"
        >
          <MessageCircle size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] h-[28rem] bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageCircle size={20} />
          <div>
            <h3 className="font-semibold text-lg">
              {initialChatType === 'admin_support'
                ? 'Support'
                : initialChatType === 'general'
                ? 'General Chat'
                : bookingId
                ? `Booking #${bookingId.slice(-6)}`
                : 'Chat'}
            </h3>
            <p className="text-sm opacity-90">Chat</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {showAdminSupport && user?.role !== 'admin' && (
            <button
              onClick={() => setShowAdminSupportModal(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
              title="Create Admin Support"
              aria-label="Create admin support request"
            >
              <HelpCircle size={18} />
            </button>
          )}
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
              title="Minimize"
              aria-label="Minimize chat window"
            >
              <span className="text-lg">—</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
              title="Close"
              aria-label="Close chat window"
            >
              <X size={18} />
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">Loading chat...</span>
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        )}

        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-2xl shadow-md animate-fade-in">
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
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (e.target.value.trim()) handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200"
            aria-label="Type your message"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendingMessage}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 flex items-center space-x-2"
            aria-label={sendingMessage ? 'Sending message' : 'Send message'}
          >
            <Send size={18} />
            <span className="hidden sm:inline">{sendingMessage ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </div>

      {/* Admin Support Modal */}
      {showAdminSupportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-blue-600 dark:text-blue-300">Create Support Request</h3>
              <button
                onClick={() => setShowAdminSupportModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                title="Close"
                aria-label="Close support request modal"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Category</label>
                <select
                  value={adminSupportForm.category}
                  onChange={(e) =>
                    setAdminSupportForm((prev) => ({
                      ...prev,
                      category: e.target.value as AdminSupportForm['category'],
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  aria-label="Select support category"
                >
                  <option value="technical_issue">Technical Issue</option>
                  <option value="booking_issue">Booking Issue</option>
                  <option value="payment_issue">Payment Issue</option>
                  <option value="service_quality">Service Quality</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Support Type</label>
                <select
                  value={adminSupportForm.supportType}
                  onChange={(e) =>
                    setAdminSupportForm((prev) => ({
                      ...prev,
                      supportType: e.target.value as AdminSupportForm['supportType'],
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  aria-label="Select support type"
                >
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="general">General</option>
                  <option value="complaint">Complaint</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Priority</label>
                <select
                  value={adminSupportForm.priority}
                  onChange={(e) =>
                    setAdminSupportForm((prev) => ({
                      ...prev,
                      priority: e.target.value as AdminSupportForm['priority'],
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  aria-label="Select priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={adminSupportForm.description}
                  onChange={(e) =>
                    setAdminSupportForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe your issue or question..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows={4}
                  aria-label="Enter support request description"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAdminSupportModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  aria-label="Cancel support request"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAdminSupport}
                  disabled={!adminSupportForm.description.trim()}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-400 transition-all duration-200 hover:scale-105"
                  aria-label="Create support request"
                >
                  Create Support
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBox;