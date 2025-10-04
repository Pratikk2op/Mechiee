import { Server } from 'socket.io';
import { ChatSession } from '../models/Chat.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

let io = null;

/**
 * Initialize Socket.IO server
 * @param {import('http').Server} server - HTTP server instance
 * @returns {Server} Socket.IO instance
 */
function initSocket(server) {
  if (io) {
    io.close();
    io = null;
  }

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
       const allowedOrigins = (
  process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:3001',
    'https://mechiee.in',
    'https://mechanic.mechiee.in',
    'https://garage.mechiee.in',
    'https://admin.mechiee.in',
    'https://api.mechiee.in', // ✅ add your API domain here
  ]
).map(origin => origin.trim());

        console.log(`🔍 Socket.IO CORS check - Origin: ${origin}`);
        if (!origin || allowedOrigins.includes(origin)) {
          console.log(`✅ Socket.IO CORS allowed for origin: ${origin}`);
          callback(null, true);
        } else {
          console.log(`❌ Socket.IO CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [${socket.id}] New client connected`);

    /**
     * JOIN ROOM
     * Accepts either { room } or { roomId } for backward compatibility
     */
    socket.on('joinRoom', async (data) => {
      if (!data || typeof data !== 'object') {
        console.error(`❌ [${socket.id}] Invalid joinRoom data: not an object`, data);
        socket.emit('error', { message: 'Invalid joinRoom data', details: 'Data must be an object' });
        return;
      }

      const roomId = data.roomId || data.room; // <-- normalize  // FIX
      const { userId, senderRole, garageId } = data;

      const missingFields = [];
      if (!roomId || typeof roomId !== 'string') missingFields.push('roomId'); // FIX
      if (!userId || typeof userId !== 'string') missingFields.push('userId');
      if (!senderRole || !['customer', 'garage', 'mechanic', 'admin'].includes(senderRole)) missingFields.push('senderRole');

      if (missingFields.length > 0) {
        console.error(`❌ [${socket.id}] Invalid joinRoom: missing ${missingFields.join(', ')}`, { roomId, userId, senderRole, garageId });
        socket.emit('error', { message: 'Invalid joinRoom data', details: `Missing fields: ${missingFields.join(', ')}` });
        return;
      }

      // store on socket
      socket.userId = userId;
      socket.userRole = senderRole;
      socket.userName = socket.userName || 'Unknown User';

      try {
        let session;

        if (roomId.startsWith('booking_')) {
          const bookingId = roomId.replace('booking_', '');
          const booking = await Booking.findById(bookingId);
          if (!booking) {
            console.warn(`❌ [${socket.id}] No booking found for bookingId: ${bookingId}`);
            socket.emit('error', { message: 'Booking not found', details: `No booking for bookingId: ${bookingId}` });
            return;
          }
          // Enforce access by booking status
          const isAcceptedStatus = ['accepted', 'assigned', 'completed'].includes(booking.status);
          if (!isAcceptedStatus && socket.userRole !== 'admin') {
            socket.emit('error', { message: 'Booking chat available after acceptance', details: `Current status: ${booking.status}` });
            return;
          }

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

          const hasAccess =
            (senderRole === 'customer' && booking.customer.toString() === userId) ||
            (senderRole === 'garage' && booking.garage && booking.garage.toString() === garageId) ||
            (senderRole === 'mechanic' && booking.mechanic && booking.mechanic.toString() === userId) ||
            (senderRole === 'admin');

          if (!hasAccess) {
            console.error(`❌ [${socket.id}] Access denied to booking ${bookingId}`);
            socket.emit('error', { message: 'Access denied to this booking chat' });
            return;
          }
        } else if (roomId.startsWith('support_')) {
          // New support room tied to a bookingId for customer<->admin pre-acceptance chat
          const bookingId = roomId.replace('support_', '');
          const booking = await Booking.findById(bookingId);
          if (!booking) {
            socket.emit('error', { message: 'Booking not found' });
            return;
          }
          // Only allow when not yet accepted/assigned/completed
          const isAcceptedStatus = ['accepted', 'assigned', 'completed'].includes(booking.status);
          if (isAcceptedStatus) {
            socket.emit('error', { message: 'Support chat closed after acceptance' });
            return;
          }
          // Only customer or admin can enter support room
          if (!(senderRole === 'customer' || senderRole === 'admin')) {
            socket.emit('error', { message: 'Only customer and admin can join support chat' });
            return;
          }
          // Find or create support session marked isAdminChat with bookingId
          session = await ChatSession.findOne({ bookingId, isAdminChat: true });
          if (!session) {
            session = await ChatSession.create({
              bookingId,
              isAdminChat: true,
              title: `Support for booking #${booking._id.toString().slice(-6)}`,
              participants: {
                customerId: booking.customer
              },
              messages: [],
              permissions: { canSendMessage: true, canSendFiles: true, canSendLocation: false }
            });
          }
        } else {
          console.error(`❌ [${socket.id}] Invalid room format: ${roomId}`);
          socket.emit('error', { message: 'Invalid room format', details: `Room must start with 'booking_' or 'support_'` });
          return;
        }

        socket.join(roomId);
        socket.roomId = roomId;

        console.log(`✅ [${socket.id}] User ${userId} (${senderRole}) joined room: ${roomId}`);

        // Fetch user name
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

        // System message: user joined (let Mongoose assign _id)
        const systemMessage = {
          senderId: 'system',
          senderName: 'System',
          senderRole: 'system',
          content: `${userName} joined the chat`,
          timestamp: new Date(),
          isSystemMessage: true,
          readBy: []
        };

        session.messages.push(systemMessage);
        session.lastActivity = new Date();
        await session.save();

        // Emit to room with flat message + roomId
        io.to(roomId).emit('receiveMessage', { ...systemMessage, roomId }); // FIX

        socket.to(roomId).emit('userJoined', {
          userId,
          userRole: senderRole,
          userName
        });

        socket.emit('chatSessionInfo', {
          roomId,
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

    /**
     * SEND MESSAGE
     * Accepts either { room, sender } or { roomId, senderId } for compatibility
     */
    socket.on('sendMessage', async (messageData) => {
      try {
        const roomId = messageData.roomId || messageData.room; // FIX
        const senderId = messageData.senderId || messageData.sender; // FIX
        const { content, senderRole, timestamp } = messageData;

        if (!roomId || !content || !senderId || !senderRole) {
          socket.emit('error', { message: 'Missing required message data' });
          return;
        }

        if (!socket.roomId || socket.roomId !== roomId) {
          socket.emit('error', { message: 'You are not in this room' });
          return;
        }

        if (senderId !== socket.userId) {
          socket.emit('error', { message: 'Sender ID mismatch' });
          return;
        }

        // locate session
        let session;
        if (roomId.startsWith('booking_')) {
          const bookingIdFromRoom = roomId.replace('booking_', '');
          // Re-check booking status for sending guard
          const booking = await Booking.findById(bookingIdFromRoom);
          if (!booking) {
            socket.emit('error', { message: 'Booking not found' });
            return;
          }
          const isAcceptedStatus = ['accepted', 'assigned', 'completed'].includes(booking.status);
          if (!isAcceptedStatus && socket.userRole !== 'admin') {
            socket.emit('error', { message: 'Booking chat available after acceptance' });
            return;
          }
          session = await ChatSession.findOne({ bookingId: bookingIdFromRoom });
        } else if (roomId.startsWith('support_')) {
          const bookingId = roomId.replace('support_', '');
          const booking = await Booking.findById(bookingId);
          if (!booking) {
            socket.emit('error', { message: 'Booking not found' });
            return;
          }
          const isAcceptedStatus = ['accepted', 'assigned', 'completed'].includes(booking.status);
          if (isAcceptedStatus) {
            socket.emit('error', { message: 'Support chat closed after acceptance' });
            return;
          }
          // Only customer/admin can send here
          if (!(socket.userRole === 'customer' || socket.userRole === 'admin')) {
            socket.emit('error', { message: 'Only customer and admin can send in support chat' });
            return;
          }
          session = await ChatSession.findOne({ bookingId, isAdminChat: true });
        }
        if (!session) {
          socket.emit('error', { message: 'Chat session not found' });
          return;
        }

        // sender name
        let senderName = 'Unknown User';
        try {
          const user = await User.findById(senderId);
          if (user) senderName = user.name;
        } catch (e) {
          console.error('Error fetching user:', e);
        }

        // Message (let Mongoose assign _id)
        const message = {
          senderId,
          senderRole,
          senderName,
          content,
          messageType: 'text',
          timestamp: new Date(timestamp || Date.now()),
          readBy: [{ userId: senderId, readAt: new Date() }],
          isSystemMessage: false
        };

        session.messages.push(message);
        session.lastActivity = new Date();
        await session.save();

        // Emit ONLY receiveMessage with flat payload + roomId
        io.to(roomId).emit('receiveMessage', { ...message, roomId }); // FIX (removed newMessage)

        // Typing stopped (emit standardized event)
        socket.to(roomId).emit('userStoppedTyping', { // FIX
          userId: senderId,
          userRole: senderRole,
          userName: senderName,
          roomId
        });

        console.log(`💬 [${socket.id}] Message sent in room ${roomId} by ${senderRole} ${senderId}`);

        // Notifications to other participants
        const otherParticipants = [];
        if (session.participants) {
          if (session.participants.customerId && session.participants.customerId.toString() !== senderId) {
            otherParticipants.push(session.participants.customerId.toString());
          }
          if (session.participants.garageId && session.participants.garageId.toString() !== senderId) {
            otherParticipants.push(session.participants.garageId.toString());
          }
          if (session.participants.mechanicId && session.participants.mechanicId.toString() !== senderId) {
            otherParticipants.push(session.participants.mechanicId.toString());
          }
          if (session.participants.adminId && session.participants.adminId.toString() !== senderId) {
            otherParticipants.push(session.participants.adminId.toString());
          }
        }

        for (const participantId of otherParticipants) {
          try {
            io.to(participantId.toString()).emit('notification', {
              type: 'chat:new_message',
              message: `New message in ${roomId.startsWith('booking_') ? 'booking chat' : 'support chat'}`,
              payload: { roomId, messageId: message._id },
              timestamp: new Date()
            });
          } catch (error) {
            console.error(`Error sending notification to ${participantId}:`, error);
          }
        }

      } catch (error) {
        console.error(`❌ [${socket.id}] Error handling sendMessage:`, error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * TYPING INDICATORS
     * Standard events: userTyping / userStoppedTyping
     * Also accept legacy typing/stopTyping and map to new ones
     */
    const handleTyping = ({ roomId, room, userId, userRole, userName }) => {
      const rId = roomId || room;
      if (!rId || !userId) return;
      socket.to(rId).emit('userTyping', { // FIX (standardized)
        roomId: rId,
        userId,
        userRole: userRole || socket.userRole || 'user',
        userName: userName || socket.userName || 'User'
      });
    };

    const handleStopTyping = ({ roomId, room, userId, userRole, userName }) => {
      const rId = roomId || room;
      if (!rId || !userId) return;
      socket.to(rId).emit('userStoppedTyping', { // FIX (standardized)
        roomId: rId,
        userId,
        userRole: userRole || socket.userRole || 'user',
        userName: userName || socket.userName || 'User'
      });
    };

    // New event names
    socket.on('userTyping', handleTyping);           // FIX
    socket.on('userStoppedTyping', handleStopTyping); // FIX

    // Backward compatibility with legacy names
    socket.on('typing', handleTyping);       // legacy → mapped to userTyping
    socket.on('stopTyping', handleStopTyping); // legacy → mapped to userStoppedTyping

    /**
     * READ RECEIPTS
     */
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

    /**
     * LEAVE ROOM
     */
    socket.on('leaveRoom', async ({ roomId }) => {
      try {
        if (!roomId || socket.roomId !== roomId) {
          socket.emit('error', { message: 'Invalid room ID' });
          return;
        }

        // System message: user left (let Mongoose assign _id)
        const systemMessage = {
          senderId: 'system',
          senderName: 'System',
          senderRole: 'system',
          content: `${socket.userName || 'Unknown User'} left the chat`,
          timestamp: new Date(),
          isSystemMessage: true,
          readBy: []
        };

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

        socket.to(roomId).emit('receiveMessage', { ...systemMessage, roomId }); // FIX

        socket.to(roomId).emit('userLeft', {
          userId: socket.userId,
          userRole: socket.userRole,
          userName: socket.userName || 'Unknown User'
        });

        socket.leave(roomId);
        socket.roomId = null;

        console.log(`👋 [${socket.id}] User ${socket.userId} left room: ${roomId}`);

      } catch (error) {
        console.error(`❌ [${socket.id}] Error leaving room:`, error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    /**
     * LOCATION STREAMS (unchanged)
     */
    socket.on('locationUpdate', async ({ bookingId, location }) => {
      try {
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

    socket.on('joinLocationRoom', (bookingId) => {
      if (!bookingId) return;
      socket.join(`location_${bookingId}`);
      console.log(`📍 Socket ${socket.id} joined location room: location_${bookingId}`);
    });

    socket.on('leaveLocationRoom', (bookingId) => {
      if (!bookingId) return;
      socket.leave(`location_${bookingId}`);
      console.log(`📍 Socket ${socket.id} left location room: location_${bookingId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [${socket.id}] Client disconnected`);
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
