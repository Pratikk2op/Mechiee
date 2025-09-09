import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import { ChatSession } from '../models/Chat.js';
import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import Garage from '../models/Garage.js';
import Mechanic from '../models/Mechanic.js';
import User from '../models/User.js';

const router = express.Router();

// Get user's chat rooms
router.get('/rooms', auth, async ( req,res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let chatRooms = [];

    if (userRole === 'customer') {
      // Get booking-based chats for customer
      const customer = await Customer.findOne({ user: userId });
      if (customer) {
        const bookings = await Booking.find({ customer: customer._id });
        
        for (const booking of bookings) {
          let chatSession = await ChatSession.findOne({ bookingId: booking._id });
          
          // Create chat session if it doesn't exist
          if (!chatSession) {
            chatSession = new ChatSession({
              bookingId: booking._id,
              participants: {
                customerId: customer._id,
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
            await chatSession.save();
            
          }
          
          const garage = await Garage.findById(booking.garage);
          const mechanic = booking.mechanic ? await Mechanic.findById(booking.mechanic) : null;
          
          const isAcceptedStatus = ['accepted', 'assigned', 'completed'].includes(booking.status);
          const roomId = isAcceptedStatus ? `booking_${booking._id}` : `support_${booking._id}`;
          chatRooms.push({
            id: roomId,
            type: isAcceptedStatus ? 'booking' : 'support',
            bookingId: booking._id.toString(),
            participants: [
              {
                userId: customer.user.toString(),
                name: customer.name,
                role: 'customer',
                avatar: customer.avatar,
                isOnline: false
              },
              ...(garage ? [{
                userId: garage.userId.toString(),
                name: garage.garageName,
                role: 'garage',
                avatar: garage.avatar,
                isOnline: false
              }] : []),
              ...(mechanic ? [{
                userId: mechanic?.user?.toString(),
                name: mechanic.name,
                role: 'mechanic',
                avatar: mechanic.avatar,
                isOnline: false
              }] : [])
            ],
            lastMessage: chatSession.lastMessage,
            unreadCount: chatSession.messages.filter(msg => 
              msg.senderId.toString() !== userId && !msg.readBy.some(read => read.userId.toString() === userId)
            ).length,
            createdAt: chatSession.createdAt,
            updatedAt: chatSession.updatedAt
          });
        }
      }

      // Get admin support chats for customer
      const adminChats = await ChatSession.find({
        isAdminChat: true,
        'participants.customerId': customer?._id
      }).populate('participants.adminId', 'name email');

      for (const chat of adminChats) {
        chatRooms.push({
          id: `admin_support_${chat._id}`,
          type: 'admin_support',
          chatId: chat._id.toString(),
          participants: [
            {
              userId: customer.user.toString(),
              name: customer.name,
              role: 'customer',
              avatar: customer.avatar,
              isOnline: false
            },
            {
              userId: chat.participants.adminId._id.toString(),
              name: chat.participants.adminId.name,
              role: 'admin',
              avatar: chat.participants.adminId.avatar,
              isOnline: false
            }
          ],
          lastMessage: chat.lastMessage,
          unreadCount: chat.messages.filter(msg => 
            msg.senderId.toString() !== userId && !msg.readBy.some(read => read.userId.toString() === userId)
          ).length,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        });
      }
    } else if (userRole === 'garage') {
      // Get booking-based chats for garage
      const garage = await Garage.findOne({ userId });
      if (garage) {
        const bookings = await Booking.find({ garage: garage._id });
        
        for (const booking of bookings) {
          let chatSession = await ChatSession.findOne({ bookingId: booking._id });
          
          // Create chat session if it doesn't exist
          if (!chatSession) {
            const customer = await Customer.findById(booking.customer);
            chatSession = new ChatSession({
              bookingId: booking._id,
              participants: {
                customerId: customer?._id,
                garageId: garage._id,
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
            await chatSession.save();
          }
          
          const customer = await Customer.findById(booking.customer);
          const mechanic = booking.mechanic ? await Mechanic.findById(booking.mechanic) : null;
          
          const isAcceptedStatus = ['accepted', 'assigned', 'completed'].includes(booking.status);
          if (!isAcceptedStatus) continue;
          chatRooms.push({
            id: `booking_${booking._id}`,
            type: 'booking',
            bookingId: booking._id.toString(),
            participants: [
              {
                userId: customer?.user?.toString() || '',   
                name: customer?.name || 'Unknown Customer',
                role: 'customer',
                avatar: customer?.avatar || '',
                isOnline: false
              },
              {
                userId: garage?.userId?.toString() || '',
                name: garage?.garageName || 'Unknown Garage',
                role: 'garage',
                avatar: garage?.avatar || '',
                isOnline: false
              },
              ...(mechanic && mechanic.user ? [{
                userId: mechanic.user.toString(),
                name: mechanic.name,
                role: 'mechanic',
                avatar: mechanic.avatar,
                isOnline: false
              }] : [])
            ],
            lastMessage: chatSession.lastMessage,
            unreadCount: chatSession.messages.filter(msg => 
              msg.senderId.toString() !== userId && !msg.readBy.some(read => read.userId.toString() === userId)
            ).length,
            createdAt: chatSession.createdAt,
            updatedAt: chatSession.updatedAt
          });
        }
      }

      // Get admin support chats for garage
      const adminChats = await ChatSession.find({
        isAdminChat: true,
        'participants.garageId': garage?._id
      }).populate('participants.adminId', 'name email');

      for (const chat of adminChats) {
        chatRooms.push({
          id: `admin_support_${chat._id}`,
          type: 'admin_support',
          chatId: chat._id.toString(),
          participants: [
            {
              userId: garage?.userId?.toString() || '',
              name: garage?.garageName || 'Unknown Garage',
              role: 'garage',
              avatar: garage?.avatar || '',
              isOnline: false
            },
            ...(chat.participants.adminId ? [{
              userId: chat.participants.adminId._id.toString(),
              name: chat.participants.adminId.name,
              role: 'admin',
              avatar: '',
              isOnline: false
            }] : [])
          ],
          lastMessage: chat.lastMessage,
          unreadCount: chat.messages.filter(msg => 
            msg.senderId.toString() !== userId && !msg.readBy.some(read => read.userId.toString() === userId)
          ).length,
          supportStatus: chat.supportStatus,
          priority: chat.priority,
          category: chat.category,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        });
      }
    } else if (userRole === 'mechanic') {
      // Get booking-based chats for mechanic
      const mechanic = await Mechanic.findOne({ user: userId });
      if (mechanic) {
        const bookings = await Booking.find({ mechanic: mechanic._id });
        
        for (const booking of bookings) {
          let chatSession = await ChatSession.findOne({ bookingId: booking._id });
          
          // Create chat session if it doesn't exist
          if (!chatSession) {
            const customer = await Customer.findById(booking.customer);
            const garage = await Garage.findById(booking.garage);
            chatSession = new ChatSession({
              bookingId: booking._id,
              participants: {
                customerId: customer?._id,
                garageId: garage?._id,
                mechanicId: mechanic._id
              },
              title: `Booking #${booking._id.toString().slice(-6)} Chat`,
              messages: [],
              permissions: {
                canSendMessage: true,
                canSendFiles: true,
                canSendLocation: true
              }
            });
            await chatSession.save();
          }
          
          const customer = await Customer.findById(booking.customer);
          const garage = await Garage.findById(booking.garage);
          
          const isAcceptedStatus = ['accepted', 'assigned', 'completed'].includes(booking.status);
          if (!isAcceptedStatus) continue;
          chatRooms.push({
            id: `booking_${booking._id}`,
            type: 'booking',
            bookingId: booking._id.toString(),
            participants: [
              {
                userId: customer?.user?.toString() || '',
                name: customer?.name || 'Unknown Customer',
                role: 'customer',
                avatar: customer?.avatar || '',
                isOnline: false
              },
              {
                userId: garage?.userId?.toString() || '',
                name: garage?.garageName || 'Unknown Garage',
                role: 'garage',
                avatar: garage?.avatar || '',
                isOnline: false
              },
              {
                userId: mechanic.user.toString(),
                name: mechanic.name,
                role: 'mechanic',
                avatar: mechanic.avatar,
                isOnline: false
              }
            ],
            lastMessage: chatSession.lastMessage,
            unreadCount: chatSession.messages.filter(msg => 
              msg.senderId.toString() !== userId && !msg.readBy.some(read => read.userId.toString() === userId)
            ).length,
            createdAt: chatSession.createdAt,
            updatedAt: chatSession.updatedAt
          });
        }
      }

      // Get admin support chats for mechanic
      const adminChats = await ChatSession.find({
        isAdminChat: true,
        'participants.mechanicId': mechanic?._id
      }).populate('participants.adminId', 'name email');

      for (const chat of adminChats) {
        chatRooms.push({
          id: `admin_support_${chat._id}`,
          type: 'admin_support',
          chatId: chat._id.toString(),
          participants: [
            {
              userId: mechanic?.user?.toString() || '',
              name: mechanic?.name || 'Unknown Mechanic',
              role: 'mechanic',
              avatar: mechanic?.avatar || '',
              isOnline: false
            },
            ...(chat.participants.adminId ? [{
              userId: chat.participants.adminId._id.toString(),
              name: chat.participants.adminId.name,
              role: 'admin',
              avatar: '',
              isOnline: false
            }] : [])
          ],
          lastMessage: chat.lastMessage,
          unreadCount: chat.messages.filter(msg => 
            msg.senderId.toString() !== userId && !msg.readBy.some(read => read.userId.toString() === userId)
          ).length,
          supportStatus: chat.supportStatus,
          priority: chat.priority,
          category: chat.category,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        });
      }
    } else if (userRole === 'admin') {
      // Get all admin support chats
      const adminChats = await ChatSession.find({
        isAdminChat: true
      }).populate([
        { path: 'participants.customerId', select: 'name user' },
        { path: 'participants.garageId', select: 'garageName userId' },
        { path: 'participants.mechanicId', select: 'name user' },
        { path: 'participants.adminId', select: 'name email' }
      ]);

      for (const chat of adminChats) {
        const participants = [];
        
        if (chat.participants.customerId) {
          participants.push({
            userId: chat.participants.customerId.user.toString(),
            name: chat.participants.customerId.name,
            role: 'customer',
            avatar: '',
            isOnline: false
          });
        }
        
        if (chat.participants.garageId) {
          participants.push({
            userId: chat.participants.garageId.userId.toString(),
            name: chat.participants.garageId.garageName,
            role: 'garage',
            avatar: '',
            isOnline: false
          });
        }
        
        if (chat.participants.mechanicId) {
          participants.push({
            userId: chat.participants.mechanicId.user.toString(),
            name: chat.participants.mechanicId.name,
            role: 'mechanic',
            avatar: '',
            isOnline: false
          });
        }
        
        if (chat.participants.adminId) {
          participants.push({
            userId: chat.participants.adminId._id.toString(),
            name: chat.participants.adminId.name,
            role: 'admin',
            avatar: '',
            isOnline: false
          });
        }

        // Prefer support_<bookingId> style for pre-acceptance chats (if tied to booking)
        const roomId = chat.bookingId ? `support_${chat.bookingId}` : `admin_support_${chat._id}`;
        const type = chat.bookingId ? 'support' : 'admin_support';

        chatRooms.push({
          id: roomId,
          type,
          chatId: chat._id.toString(),
          bookingId: chat.bookingId ? chat.bookingId.toString() : undefined,
          participants,
          lastMessage: chat.lastMessage,
          unreadCount: chat.messages.filter(msg => 
            msg.senderId.toString() !== userId && !msg.readBy.some(read => read.userId.toString() === userId)
          ).length,
          supportStatus: chat.supportStatus,
          priority: chat.priority,
          category: chat.category,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        });
      }
    }

    res.json(chatRooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// Get chat messages - Fixed endpoint to match frontend expectations
router.get('/:roomId/messages', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    let chatSession;

    if (roomId.startsWith('booking_')) {
      const bookingId = roomId.replace('booking_', '');
      
      // Check if booking exists
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Find or create chat session for this booking
      chatSession = await ChatSession.findOne({ bookingId });
      if (!chatSession) {
        // Create new chat session for the booking
        chatSession = new ChatSession({
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
        await chatSession.save();
      }
    } else if (roomId.startsWith('support_')) {
      const bookingId = roomId.replace('support_', '');
      // Pre-acceptance customer-admin support session
      chatSession = await ChatSession.findOne({ bookingId, isAdminChat: true });
      if (!chatSession) {
        // Create ephemeral support session until booking accepted
        chatSession = new ChatSession({
          bookingId,
          isAdminChat: true,
          title: `Support for booking #${bookingId.toString().slice(-6)}`,
          messages: [],
          permissions: { canSendMessage: true, canSendFiles: true, canSendLocation: false }
        });
        await chatSession.save();
      }
    }

    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Mark messages as read for this user
    const unreadMessages = chatSession.messages.filter(msg => 
      msg.senderId.toString() !== userId && 
      !msg.readBy.some(read => read.userId.toString() === userId)
    );

    if (unreadMessages.length > 0) {
      for (const msg of unreadMessages) {
        msg.readBy.push({
          userId: userId,
          readAt: new Date()
        });
      }
      await chatSession.save();
    }

    // Return messages in the format expected by frontend
    res.json({
      messages: chatSession.messages || [],
      chatInfo: {
        id: chatSession._id,
        isAdminChat: chatSession.isAdminChat,
        supportStatus: chatSession.supportStatus,
        priority: chatSession.priority,
        category: chatSession.category,
        title: chatSession.title,
        description: chatSession.description
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Create admin support chat
router.post('/admin-support', auth, async (req, res) => {
  try {
    const { category, description, priority = 'medium', supportType = 'general' } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate user role
    if (!['customer', 'garage', 'mechanic'].includes(userRole)) {
      return res.status(403).json({ 
        success: false,
        error: 'Only customers, garage owners, and mechanics can create support chats' 
      });
    }

    // Validate required fields
    if (!category) {
      return res.status(400).json({ 
        success: false,
        error: 'Category is required' 
      });
    }

    // Validate enum values
    const validCategories = ['technical_issue', 'booking_issue', 'payment_issue', 'service_quality', 'other'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const validSupportTypes = ['technical', 'billing', 'general', 'complaint', 'feedback'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ 
        success: false,
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` 
      });
    }

    if (!validSupportTypes.includes(supportType)) {
      return res.status(400).json({ 
        success: false,
        error: `Invalid support type. Must be one of: ${validSupportTypes.join(', ')}` 
      });
    }

    // Find user profile and check for existing open chat
    let userProfile;
    let existingChatQuery = {
      isAdminChat: true,
      supportStatus: { $in: ['open', 'in_progress'] }
    };

    if (userRole === 'customer') {
      userProfile = await Customer.findOne({ user: userId }).populate('user', 'name email');
      if (!userProfile) {
        return res.status(404).json({ 
          success: false,
          error: 'Customer profile not found' 
        });
      }
      existingChatQuery['participants.customerId'] = userProfile._id;
    } else if (userRole === 'garage') {
      userProfile = await Garage.findOne({ userId }).populate('userId', 'name email');
      if (!userProfile) {
        return res.status(404).json({ 
          success: false,
          error: 'Garage profile not found' 
        });
      }
      existingChatQuery['participants.garageId'] = userProfile._id;
    } else if (userRole === 'mechanic') {
      userProfile = await Mechanic.findOne({ user: userId }).populate('user', 'name email');
      if (!userProfile) {
        return res.status(404).json({ 
          success: false,
          error: 'Mechanic profile not found' 
        });
      }
      existingChatQuery['participants.mechanicId'] = userProfile._id;
    }

    // Check for existing open support chat
    const existingChat = await ChatSession.findOne(existingChatQuery);
    
    if (existingChat) {
      return res.status(409).json({ 
        success: false,
        error: 'You already have an open support chat',
        data: {
          chatId: existingChat._id,
          status: existingChat.supportStatus,
          createdAt: existingChat.createdAt
        }
      });
    }

    // Prepare participants object
    const participants = {};
    participants[`${userRole}Id`] = userProfile._id;

    // Get user name for title and initial message
    let userName;
    if (userRole === 'customer' || userRole === 'mechanic') {
      userName = userProfile.user?.name || userProfile.name || `${userRole}`;
    } else if (userRole === 'garage') {
      userName = userProfile.name || userProfile.userId?.name || 'Garage Owner';
    }

    // Create support chat
    const supportChat = new ChatSession({
      isAdminChat: true,
      supportType,
      supportStatus: 'open',
      category,
      priority,
      description,
      participants,
      title: `${userName} - ${category.replace('_', ' ').toUpperCase()} Support`,
      isActive: true,
      isGroupChat: false,
      permissions: {
        canSendMessage: true,
        canSendFiles: true,
        canSendLocation: true
      },
      messages: [{
        senderId: userProfile._id,
        senderRole: userRole,
        senderName: userName,
        content: description || `Support request created for ${category.replace('_', ' ')}`,
        messageType: 'system',
        isSystemMessage: true,
        isSupportMessage: true,
        priority: priority,
        readBy: []
      }],
      lastActivity: new Date()
    });

    await supportChat.save();

    // Populate the response data
    const populatedChat = await ChatSession.findById(supportChat._id)
      .populate('participants.customerId', 'name email phone')
      .populate('participants.garageId', 'name email phone location')
      .populate('participants.mechanicId', 'name email phone specializations')
      .lean();

    // Emit socket event for admin dashboard (if you're using Socket.IO)
    // You can uncomment this if you have socket integration
    /*
    if (req.io) {
      req.io.to('admin_room').emit('new_support_request', {
        chatId: supportChat._id,
        category,
        priority,
        userRole,
        userName,
        createdAt: supportChat.createdAt
      });
    }
    */

    res.status(201).json({
      success: true,
      message: 'Support chat created successfully',
      data: {
        chatId: supportChat._id,
        roomId: `admin_support_${supportChat._id}`,
        supportStatus: supportChat.supportStatus,
        category: supportChat.category,
        priority: supportChat.priority,
        title: supportChat.title,
        createdAt: supportChat.createdAt,
        participants: populatedChat.participants
      }
    });

  } catch (error) {
    console.error('Error creating admin support chat:', error);
    
    // Handle specific mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'A support chat with similar parameters already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create support chat',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Send message
router.post('/send-message', auth, async (req, res) => {
  try {
    const { roomId, content, messageType = 'text' } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userName = req.user.name;

    if (!roomId || !content) {
      return res.status(400).json({ error: 'Room ID and content are required' });
    }

    let chatSession;

    if (roomId.startsWith('booking_')) {
      const bookingId = roomId.replace('booking_', '');
      
      // Check if booking exists
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Find or create chat session for this booking
      chatSession = await ChatSession.findOne({ bookingId });
      if (!chatSession) {
        // Create new chat session for the booking
        chatSession = new ChatSession({
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
        await chatSession.save();
      }
    } else if (roomId.startsWith('admin_support_')) {
      const chatId = roomId.replace('admin_support_', '');
      chatSession = await ChatSession.findById(chatId);
    }

    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Check if user can send messages in this chat
    if (!chatSession.permissions?.canSendMessage) {
      return res.status(403).json({ error: 'You cannot send messages in this chat' });
    }

    // Create message
    const message = {
      senderId: userId,
      senderRole: userRole,
      senderName: userName,
      content,
      messageType,
      readBy: [{ userId, readAt: new Date() }],
      timestamp: new Date()
    };

    // Add message to chat session
    chatSession.messages.push(message);
    chatSession.lastActivity = new Date();
    await chatSession.save();

    // Emit real-time message via socket
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('receiveMessage', {
        ...message,
        roomId,
        _id: message._id || Date.now().toString()
      });
    }

    res.json({
      message: 'Message sent successfully',
      messageId: message._id || Date.now().toString()
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Update support chat status (admin only)
router.put('/admin-support/:chatId/status', auth, authorize(['admin']), async (req, res) => {
  try {
    const { chatId } = req.params;
    const { supportStatus, priority, assignedAdmin } = req.body;

    const chat = await ChatSession.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Support chat not found' });
    }

    if (supportStatus) chat.supportStatus = supportStatus;
    if (priority) chat.priority = priority;
    if (assignedAdmin) chat.assignedAdmin = assignedAdmin;

    await chat.save();

    res.json({
      message: 'Support chat updated successfully',
      chat
    });
  } catch (error) {
    console.error('Error updating support chat:', error);
    res.status(500).json({ error: 'Failed to update support chat' });
  }
});

// Get support chat statistics (admin only)
router.get('/admin-support/stats', auth, authorize(['admin']), async (req, res) => {
  try {
    const stats = await ChatSession.aggregate([
      { $match: { isAdminChat: true } },
      {
        $group: {
          _id: '$supportStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalChats = await ChatSession.countDocuments({ isAdminChat: true });
    const openChats = await ChatSession.countDocuments({ isAdminChat: true, supportStatus: 'open' });
    const inProgressChats = await ChatSession.countDocuments({ isAdminChat: true, supportStatus: 'in_progress' });

    res.json({
      totalChats,
      openChats,
      inProgressChats,
      statusBreakdown: stats
    });
  } catch (error) {
    console.error('Error fetching support stats:', error);
    res.status(500).json({ error: 'Failed to fetch support statistics' });
  }
});

// Get user's support chats
router.get('/my-support-chats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!['customer', 'garage', 'mechanic'].includes(userRole)) {
      return res.status(403).json({ error: 'Only customers, garage owners, and mechanics can access support chats' });
    }

    let supportChats = [];

    if (userRole === 'customer') {
      const customer = await Customer.findOne({ user: userId });
      if (customer) {
        supportChats = await ChatSession.find({
          isAdminChat: true,
          'participants.customerId': customer._id
        }).populate('participants.adminId', 'name email');
      }
    } else if (userRole === 'garage') {
      const garage = await Garage.findOne({ userId });
      if (garage) {
        supportChats = await ChatSession.find({
          isAdminChat: true,
          'participants.garageId': garage._id
        }).populate('participants.adminId', 'name email');
      }
    } else if (userRole === 'mechanic') {
      const mechanic = await Mechanic.findOne({ user: userId });
      if (mechanic) {
        supportChats = await ChatSession.find({
          isAdminChat: true,
          'participants.mechanicId': mechanic._id
        }).populate('participants.adminId', 'name email');
      }
    }

    // Format response for frontend
    const formattedChats = supportChats.map(chat => ({
      id: chat._id.toString(),
      type: 'support',
      supportStatus: chat.supportStatus,
      priority: chat.priority,
      category: chat.category,
      lastMessage: chat.lastMessage,
      unreadCount: chat.messages.filter(msg => 
        msg.senderId.toString() !== userId && !msg.readBy.some(read => read.userId.toString() === userId)
      ).length,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    }));

    res.json(formattedChats);
  } catch (error) {
    console.error('Error fetching support chats:', error);
    res.status(500).json({ error: 'Failed to fetch support chats' });
  }
});

// Get messages for a specific booking chat
router.get('/booking_:bookingId/messages', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id || req.user.id;

    // Find the chat session for this booking
    let chatSession = await ChatSession.findOne({ bookingId });
    
    if (!chatSession) {
      // Create a new chat session if it doesn't exist
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check if user has access to this booking
      const hasAccess = 
        (req.user.role === 'customer' && booking.customer?.toString() === userId) ||
        (req.user.role === 'garage' && booking.garage?.toString() === userId) ||
        (req.user.role === 'mechanic' && booking.mechanic?.toString() === userId) ||
        req.user.role === 'admin';

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      chatSession = new ChatSession({
        bookingId: booking._id,
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
      await chatSession.save();
    }

    res.json({
      messages: chatSession.messages || [],
      chatInfo: {
        bookingId: chatSession.bookingId,
        participants: chatSession.participants,
        title: chatSession.title
      }
    });
  } catch (error) {
    console.error('Error fetching booking messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

export default router;