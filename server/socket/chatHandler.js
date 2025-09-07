import { Server } from 'socket.io';
import { ChatSession } from '../models/Chat.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
// Import will be handled dynamically to avoid circular dependency

// Define types for TypeScript compatibility
/**
 * @typedef {Object} JoinRoomData
 * @property {string} room - Room ID (booking_<bookingId> or admin_support_<chatId>)
 * @property {string} userId
 * @property {'customer' | 'garage' | 'mechanic' | 'admin'} senderRole
 * @property {string} [garageId] - Required for booking rooms
 */

/**
 * @typedef {Object} SendMessageData
 * @property {string} room - Room ID
 * @property {Object} message
 * @property {string} message.senderId
 * @property {string} message.senderName
 * @property {'customer' | 'garage' | 'mechanic' | 'admin'} message.senderRole
 * @property {string} message.content
 * @property {string} message.timestamp
 */

let io = null;

/**
 * Initialize Socket.IO server
 * @param {import('http').Server} server - HTTP server instance
 * @returns {Server} Socket.IO instance
 */
function initSocket(server) {
  // Clear existing io instance to handle server restarts
  if (io) {
    io.close();
    io = null;
  }

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        const allowedOrigins = [
          'http://localhost:5173',
          'http://localhost:3000',
          process.env.FRONTEND_URL,
        ].filter(Boolean);

        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [${socket.id}] New client connected`);

    socket.on('joinRoom', async ({ room, userId, senderRole, garageId }) => {
      // Validate input
      const missingFields = [];
      if (!room) missingFields.push('room');
      if (!userId) missingFields.push('userId');
      if (!senderRole || !['customer', 'garage', 'mechanic', 'admin'].includes(senderRole)) missingFields.push('senderRole');

      if (missingFields.length > 0) {
        console.error(`❌ [${socket.id}] Invalid joinRoom data: missing ${missingFields.join(', ')}`);
        socket.emit('error', { message: 'Invalid joinRoom data', details: `Missing fields: ${missingFields.join(', ')}` });
        return;
      }

      // Store user info in socket
      socket.userId = userId;
      socket.userRole = senderRole;
      socket.userName = socket.userName || 'Unknown User';

      try {
        let session;
        
        if (room.startsWith('booking_')) {
          const bookingId = room.replace('booking_', '');
          // Verify booking exists
          const booking = await Booking.findById(bookingId);
          if (!booking) {
            console.warn(`❌ [${socket.id}] No booking found for bookingId: ${bookingId}`);
            socket.emit('error', { message: 'Booking not found', details: `No booking for bookingId: ${bookingId}` });
            return;
          }

          // Check if chat session exists, create if not
          session = await ChatSession.findOne({ bookingId });
          if (!session) {
            if (!garageId && senderRole !== 'customer') {
              console.error(`❌ [${socket.id}] garageId required for non-customer roles`);
              socket.emit('error', { message: 'garageId required for non-customer roles' });
              return;
            }
            session = await ChatSession.create({
              bookingId,
              participants: {
                customerId: booking.customer,
                garageId: booking.garage,
                mechanicId: booking.mechanic
              },
              title: `Booking #${booking._id.toString().slice(-6)} Chat`,
              messages: [],
              permissions: {
                canSendMessage: true,
                canSendFiles: true,
                canSendLocation: true
              }
            });
          }
        } else if (room.startsWith('admin_support_')) {
          const chatId = room.replace('admin_support_', '');
          session = await ChatSession.findById(chatId);
          if (!session) {
            console.warn(`❌ [${socket.id}] No admin support chat found for chatId: ${chatId}`);
            socket.emit('error', { message: 'Admin support chat not found', details: `No chat for chatId: ${chatId}` });
            return;
          }
        } else {
          console.error(`❌ [${socket.id}] Invalid room format: ${room}`);
          socket.emit('error', { message: 'Invalid room format', details: `Room must start with 'booking_' or 'admin_support_'` });
          return;
        }

        // Join the room
        socket.join(room);
        socket.roomId = room;
        
        console.log(`✅ [${socket.id}] User ${userId} (${senderRole}) joined room: ${room}`);

        // Get user name for notifications
        let userName = 'Unknown User';
        try {
          const user = await User.findById(userId);
          if (user) {
            userName = user.name;
            socket.userName = userName;
          }
        } catch (error) {
          console.warn('Could not fetch user name:', error);
        }

        // Emit system message for user joining
        const systemMessage = {
          _id: Date.now().toString(),
          senderId: 'system',
          senderName: 'System',
          senderRole: 'system',
          content: `${userName} joined the chat`,
          timestamp: new Date(),
          isSystemMessage: true,
          readBy: []
        };

        // Add system message to chat session
        session.messages.push(systemMessage);
        session.lastActivity = new Date();
        await session.save();

        // Emit system message to all users in the room
        io.to(room).emit('receiveMessage', systemMessage);

        // Notify other users about user joining
        socket.to(room).emit('userJoined', {
          userId,
          userRole: senderRole,
          userName
        });

        // Send chat session info
        socket.emit('chatSessionInfo', {
          roomId: room,
          sessionId: session._id,
          isAdminChat: session.isAdminChat,
          supportStatus: session.supportStatus,
          priority: session.priority,
          category: session.category
        });

      } catch (error) {
        console.error(`❌ [${socket.id}] Error joining room:`, error);
        socket.emit('error', { message: 'Failed to join room', details: error.message });
      }
    });

    socket.on('sendMessage', async (messageData) => {
      try {
        const { room, content, sender, senderRole, timestamp, bookingId } = messageData;
        
        if (!room || !content || !sender || !senderRole) {
          socket.emit('error', { message: 'Missing required message data' });
          return;
        }

        if (!socket.roomId || socket.roomId !== room) {
          socket.emit('error', { message: 'You are not in this room' });
          return;
        }

        // Find or create chat session
        let session;
        
        if (room.startsWith('booking_')) {
          const bookingIdFromRoom = room.replace('booking_', '');
          session = await ChatSession.findOne({ bookingId: bookingIdFromRoom });
        } else if (room.startsWith('admin_support_')) {
          const chatId = room.replace('admin_support_', '');
          session = await ChatSession.findById(chatId);
        }

        if (!session) {
          socket.emit('error', { message: 'Chat session not found' });
          return;
        }

        // Get sender name
        let senderName = 'Unknown User';
        try {
          const user = await User.findById(sender);
          if (user) {
            senderName = user.name;
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }

        // Create message
        const message = {
          _id: Date.now().toString(),
          senderId: sender,
          senderRole: senderRole,
          senderName,
          content,
          messageType: 'text',
          timestamp: new Date(timestamp),
          readBy: [{ userId: sender, readAt: new Date() }],
          isSystemMessage: false
        };

        // Save message to session
        session.messages.push(message);
        session.lastActivity = new Date();
        await session.save();

        // Emit message to all users in the room
        io.to(room).emit('newMessage', message);

        // Update typing status
        socket.to(room).emit('stopTyping', { 
          userId: sender, 
          room 
        });

        console.log(`💬 [${socket.id}] Message sent in room ${room} by ${senderRole} ${sender}`);

        // Send notification to other participants
        const otherParticipants = session.participants ? 
          Object.values(session.participants).filter(p => p && p.toString() !== sender) : [];
        
        for (const participantId of otherParticipants) {
          if (participantId && participantId.toString() !== sender) {
            try {
              io.to(participantId.toString()).emit('notification', {
                type: 'chat:new_message',
                message: `New message in ${room.startsWith('booking_') ? 'booking chat' : 'support chat'}`,
                payload: { room, messageId: message._id },
                timestamp: new Date()
              });
            } catch (error) {
              console.error(`Error sending notification to ${participantId}:`, error);
            }
          }
        }

      } catch (error) {
        console.error(`❌ [${socket.id}] Error handling sendMessage:`, error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ room, userId }) => {
      try {
        if (!room || !userId) {
          return;
        }

        // Emit typing indicator to other users in the room
        socket.to(room).emit('typing', { userId, room });
      } catch (error) {
        console.error(`❌ [${socket.id}] Error handling typing:`, error);
      }
    });

    socket.on('stopTyping', ({ room, userId }) => {
      try {
        if (!room || !userId) {
          return;
        }

        // Emit stop typing indicator to other users in the room
        socket.to(room).emit('stopTyping', { userId, room });
      } catch (error) {
        console.error(`❌ [${socket.id}] Error handling stop typing:`, error);
      }
    });

    socket.on('markAsRead', async ({ roomId, messageIds }) => {
      try {
        if (!roomId || !messageIds || !Array.isArray(messageIds)) {
          socket.emit('error', { message: 'Invalid markAsRead data' });
          return;
        }

        let session;
        
        if (roomId.startsWith('booking_')) {
          const bookingId = roomId.replace('booking_', '');
          session = await ChatSession.findOne({ bookingId });
        } else if (roomId.startsWith('admin_support_')) {
          const chatId = roomId.replace('admin_support_', '');
          session = await ChatSession.findById(chatId);
        }

        if (!session) {
          socket.emit('error', { message: 'Chat session not found' });
          return;
        }

        // Mark messages as read
        for (const messageId of messageIds) {
          const message = session.messages.id(messageId);
          if (message && !message.readBy.some(read => read.userId.toString() === socket.userId)) {
            message.readBy.push({
              userId: socket.userId,
              readAt: new Date()
            });
          }
        }

        await session.save();

        // Emit read receipt
        socket.to(roomId).emit('messagesRead', {
          userId: socket.userId,
          userRole: socket.userRole,
          messageIds,
          roomId
        });

      } catch (error) {
        console.error(`❌ [${socket.id}] Error marking messages as read:`, error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    socket.on('leaveRoom', async ({ roomId }) => {
      try {
        if (!roomId || socket.roomId !== roomId) {
          socket.emit('error', { message: 'Invalid room ID' });
          return;
        }

        // Emit system message for user leaving
        const systemMessage = {
          _id: Date.now().toString(),
          senderId: 'system',
          senderName: 'System',
          senderRole: 'system',
          content: `${socket.userName || 'Unknown User'} left the chat`,
          timestamp: new Date(),
          isSystemMessage: true,
          readBy: []
        };

        // Add system message to chat session
        let session;
        if (roomId.startsWith('booking_')) {
          const bookingId = roomId.replace('booking_', '');
          session = await ChatSession.findOne({ bookingId });
        } else if (roomId.startsWith('admin_support_')) {
          const chatId = roomId.replace('admin_support_', '');
          session = await ChatSession.findById(chatId);
        }

        if (session) {
          session.messages.push(systemMessage);
          session.lastActivity = new Date();
          await session.save();
        }

        // Emit system message to other users
        socket.to(roomId).emit('receiveMessage', systemMessage);

        // Notify other users about user leaving
        socket.to(roomId).emit('userLeft', {
          userId: socket.userId,
          userRole: socket.userRole,
          userName: socket.userName || 'Unknown User'
        });

        // Leave the room
        socket.leave(roomId);
        socket.roomId = null;
        
        console.log(`👋 [${socket.id}] User ${socket.userId} left room: ${roomId}`);

      } catch (error) {
        console.error(`❌ [${socket.id}] Error leaving room:`, error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Handle real-time location updates
    socket.on('locationUpdate', async ({ bookingId, location }) => {
      try {
        // Emit location update to all users in the booking room
        io.to(`location_${bookingId}`).emit('locationUpdated', {
          bookingId,
          location,
          timestamp: new Date()
        });
        
        console.log(`📍 Location update for booking ${bookingId} from ${location.userRole} ${location.userId}`);
      } catch (error) {
        console.error('Error handling location update:', error);
      }
    });

    // Handle joining location tracking room
    socket.on('joinLocationRoom', (bookingId) => {
      if (!bookingId) return;
      socket.join(`location_${bookingId}`);
      console.log(`📍 Socket ${socket.id} joined location room: location_${bookingId}`);
    });

    // Handle leaving location tracking room
    socket.on('leaveLocationRoom', (bookingId) => {
      if (!bookingId) return;
      socket.leave(`location_${bookingId}`);
      console.log(`📍 Socket ${socket.id} left location room: location_${bookingId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [${socket.id}] Client disconnected`);
      
      // Clean up if user was in a room
      if (socket.roomId) {
        socket.to(socket.roomId).emit('userDisconnected', {
          userId: socket.userId,
          userRole: socket.userRole,
          roomId: socket.roomId
        });
      }
    });
  });

  return io;
}

export { initSocket };