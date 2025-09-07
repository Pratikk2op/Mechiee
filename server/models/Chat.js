import mongoose from 'mongoose';

// Message Schema
const MessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['customer', 'garage', 'mechanic', 'admin'],
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'location', 'system'],
    default: 'text'
  },
  fileUrl: String,
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  // For system messages (e.g., "User joined", "User left")
  isSystemMessage: {
    type: Boolean,
    default: false
  },
  // For message reactions
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // For admin support messages
  isSupportMessage: {
    type: Boolean,
    default: false
  },
  // Priority level for support messages
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Chat Session Schema
const ChatSessionSchema = new mongoose.Schema({
  // For booking-related chats
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false
  },
  
  // For admin support chats
  isAdminChat: {
    type: Boolean,
    default: false
  },
  
  // Support chat metadata
  supportType: {
    type: String,
    enum: ['technical', 'billing', 'general', 'complaint', 'feedback'],
    default: 'general'
  },
  
  supportStatus: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  
  // Participants in the chat
  participants: {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    garageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Garage'
    },
    mechanicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mechanic'
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Chat metadata
  title: String,
  description: String,
  
  // For support chats
  category: {
    type: String,
    enum: ['technical_issue', 'booking_issue', 'payment_issue', 'service_quality', 'other'],
    default: 'other'
  },
  
  // Priority and escalation
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Assigned admin for support
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Last activity tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Messages array
  messages: [MessageSchema],
  
  // Chat settings
  isActive: {
    type: Boolean,
    default: true
  },
  
  // For group chats (multiple mechanics in a garage)
  isGroupChat: {
    type: Boolean,
    default: false
  },
  
  // Chat permissions
  permissions: {
    canSendMessage: {
      type: Boolean,
      default: true
    },
    canSendFiles: {
      type: Boolean,
      default: true
    },
    canSendLocation: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
ChatSessionSchema.index({ bookingId: 1 });
ChatSessionSchema.index({ isAdminChat: 1 });
ChatSessionSchema.index({ 'participants.customerId': 1 });
ChatSessionSchema.index({ 'participants.garageId': 1 });
ChatSessionSchema.index({ 'participants.mechanicId': 1 });
ChatSessionSchema.index({ 'participants.adminId': 1 });
ChatSessionSchema.index({ supportStatus: 1 });
ChatSessionSchema.index({ priority: 1 });
ChatSessionSchema.index({ lastActivity: -1 });

// Update lastActivity when messages are added
ChatSessionSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastActivity = new Date();
  }
  next();
});

// Virtual for unread message count
ChatSessionSchema.virtual('unreadCount').get(function() {
  if (!this.messages) return 0;
  return this.messages.filter(msg => !msg.isDeleted).length;
});

// Virtual for last message
ChatSessionSchema.virtual('lastMessage').get(function() {
  if (!this.messages || this.messages.length === 0) return null;
  const activeMessages = this.messages.filter(msg => !msg.isDeleted);
  return activeMessages[activeMessages.length - 1] || null;
});

// Ensure virtuals are included in JSON output
ChatSessionSchema.set('toJSON', { virtuals: true });
ChatSessionSchema.set('toObject', { virtuals: true });

export const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);
export const Message = mongoose.model('Message', MessageSchema);

