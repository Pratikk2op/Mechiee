// server.js (ES Module)

import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';

import garageRoutes from './routes/garage.js';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/users.js';
import customerRoutes from './routes/customers.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import trackingRoutes from './routes/tracking.js';
import Notification from './models/Notification.js';
import { initSocket } from './socket/chatHandler.js';

dotenv.config();
EventEmitter.defaultMaxListeners = 20;

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Compression middleware
app.use(compression());

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });
// app.use('/api/', limiter);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Initialize Socket.IO with enhanced chat handler
const io = initSocket(server);

// Map userId -> socket.id for direct messaging
const userSocketMap = new Map();

// Make io accessible in routes/controllers
app.set('io', io);

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : [
      'http://localhost:5173',
      'https://mechiee.netlify.app',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://mechiee.onrender.com',
      ''
    ];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like Postman or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/garage', garageRoutes);
app.use('/api/user', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tracking', trackingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found'
//   });
// });

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      
    });
    
    console.log('✅ MongoDB connected:', conn.connection.host);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Socket.IO Connection Handling for additional features
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: socketId=${socket.id}`);
  console.log(`🔍 Socket handshake origin: ${socket.handshake.headers.origin}`);
  console.log(`🔍 Socket handshake referer: ${socket.handshake.headers.referer}`);

  // Register user and join personal and role rooms
  socket.on('register', ({ userId, role }) => {
    if (!userId) return;
    userSocketMap.set(userId, socket.id);
    socket.join(userId);
    if (role) socket.join(role);
    console.log(`✅ User registered: userId=${userId}, socketId=${socket.id}, role=${role}`);
  });

  // Join garage room (legacy handler - now handled by chatHandler.js)
  socket.on('joinRoom', (data) => {
    // This is now handled by the chat handler, but keep for backward compatibility
    if (typeof data === 'string') {
      socket.join(data);
      console.log(`Socket ${socket.id} joined room: ${data}`);
    } else {
      console.log(`Socket ${socket.id} joinRoom data:`, data);
    }
  });

  // Join booking-specific rooms (booking, chat, location)
  socket.on('joinBooking', (bookingId) => {
    if (!bookingId) return;
    socket.join(`booking_${bookingId}`);
    console.log(`Socket ${socket.id} joined booking room: booking_${bookingId}`);
  });

  socket.on('joinChatRoom', (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined chat room: ${roomId}`);
  });

  socket.on('joinLocationRoom', (bookingId) => {
    if (!bookingId) return;
    socket.join(`location_${bookingId}`);
    console.log(`Socket ${socket.id} joined location room: location_${bookingId}`);
  });

  // Handle real-time location updates
  socket.on('locationUpdate', async ({ bookingId, location, userId, userRole }) => {
    try {
      // Emit location update to all users in the booking room
      io.to(`location_${bookingId}`).emit('locationUpdated', {
        bookingId,
        location,
        userId,
        userRole,
        timestamp: new Date()
      });
      
      console.log(`📍 Location update for booking ${bookingId} from ${userRole} ${userId}`);
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  });

  // Handle real-time status updates
  socket.on('statusUpdate', async ({ bookingId, status, userId, userRole, message }) => {
    try {
      // Emit status update to all users in the booking room
      io.to(`booking_${bookingId}`).emit('statusUpdated', {
        bookingId,
        status,
        userId,
        userRole,
        message,
        timestamp: new Date()
      });
      
      console.log(`🔄 Status update for booking ${bookingId}: ${status} by ${userRole} ${userId}`);
    } catch (error) {
      console.error('Error handling status update:', error);
    }
  });

  // Handle real-time notifications
  socket.on('notification', async ({ userId, type, message, payload }) => {
    try {
      // Store notification in database
      await Notification.create({ user: userId, type, message, payload });
      
      // Send real-time notification via socket
      if (userSocketMap.has(userId)) {
        const socketId = userSocketMap.get(userId);
        io.to(socketId).emit('notification', { type, message, payload, timestamp: new Date() });
        console.log(`📨 Notification sent to user ${userId} via socket ${socketId}`);
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  });

  // Connection error handling
  socket.on('connect_error', (error) => {
    console.error(`❌ Socket connection error: ${error.message}`);
  });

  // Disconnect cleanup
  socket.on('disconnect', (reason) => {
    for (const [userId, sId] of userSocketMap.entries()) {
      if (sId === socket.id) {
        userSocketMap.delete(userId);
        console.log(`👋 User ${userId} disconnected and removed from map`);
        break;
      }
    }
    console.log(`🔌 Socket disconnected: socketId=${socket.id}, reason=${reason}`);
  });
});

// Notification helper
export async function sendNotification({ userId, role, type, message, payload = {} }) {
  try {
    // Send real-time notification via socket
    if (userId && userSocketMap.has(userId)) {
      const socketId = userSocketMap.get(userId);
      io.to(socketId).emit('notification', { type, message, payload, timestamp: new Date() });
      console.log(`📨 Notification sent to user ${userId} via socket ${socketId}`);
    } else if (role) {
      io.to(role).emit('notification', { type, message, payload, timestamp: new Date() });
      console.log(`📨 Notification sent to role ${role}`);
    }

    // Store notification in database
    if (userId) {
      await Notification.create({ user: userId, role, type, message, payload });
      console.log(`💾 Notification stored in database for user ${userId}`);
    }
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

const PORT = process.env.PORT || 5000;

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
};

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

export { io };
