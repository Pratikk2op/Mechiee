// src/types.ts

// Ensure this file is treated as a module
export {};

// User and Authentication Types
export type UserRole = 'customer' | 'garage' | 'mechanic' | 'admin';

export interface User {
  id: string;
  _id?: string; // For backward compatibility
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  accountStatus: 'active' | 'suspended' | 'deactivated';
  emailVerified: boolean;
  lastLoginAt?: Date;
  currentLocation?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
  garageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Booking Types
export interface Booking {
  id: string;
  _id?: string;
  customer: string | User;
  garage?: string | User;
  mechanic?: string | User;
  name: string;
  mobile: string;
  brand: string;
  model: string;
  serviceType: string;
  slot: string;
  bikeNumber: string;
  address: string;
  description?: string;
  lat?: number;
  lon?: number;
  price: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  status: 'pending' | 'accepted' | 'assigned' | 'completed' | 'cancelled';
  scheduledDate: Date;
  scheduledTime?: string;
  totalAmount: number;
  paymentMethod: 'upi' | 'card' | 'cash' | 'wallet';
  paymentId?: string;
  rating?: {
    score: number;
    review: string;
    createdAt: Date;
  };
  trackingData?: {
    startTime: Date;
    endTime: Date;
    mechanicLocation: {
      latitude: number;
      longitude: number;
    };
    updates: Array<{
      status: string;
      timestamp: Date;
    }>;
  };
  cancelReason?: string;
  rejectedBy?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Chat Types
export interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  messageType?: 'text' | 'file' | 'location';
  timestamp: Date;
  readBy: Array<{
    userId: string;
    readAt: Date;
  }>;
  isSystemMessage?: boolean;
}

export interface ChatSession {
  _id: string;
  bookingId?: string;
  participants: {
    customerId?: string;
    garageId?: string;
    mechanicId?: string;
  };
  title: string;
  messages: Message[];
  lastActivity: Date;
  permissions: {
    canSendMessage: boolean;
    canSendFiles: boolean;
    canSendLocation: boolean;
  };
  isAdminChat?: boolean;
  supportStatus?: string;
  priority?: string;
  category?: string;
}

// Notification Types
export interface Notification {
  _id: string;
  user: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

// Location Types
export interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Form Types
export interface LoginFormData {
  identifier: string;
  password: string;
  role: UserRole;
  loginMethod: 'email' | 'phone';
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  [key: string]: unknown;
}

export interface BookingFormData extends Record<string, unknown> {
  name: string;
  mobile: string;
  brand: string;
  model: string;
  serviceType: string;
  slot: string;
  bikeNumber: string;
  address: string;
  description?: string;
  lat?: number;
  lon?: number;
}

// Socket Event Types
export interface SocketEvents {
  connect: () => void;
  disconnect: () => void;
  joinRoom: (data: {
    room: string;
    userId: string;
    senderRole: UserRole;
    garageId?: string;
  }) => void;
  sendMessage: (data: {
    roomId: string;
    content: string;
    messageType?: string;
  }) => void;
  typing: (data: { roomId: string }) => void;
  stopTyping: (data: { roomId: string }) => void;
  markAsRead: (data: { roomId: string; messageIds: string[] }) => void;
  leaveRoom: (data: { roomId: string }) => void;
  locationUpdate: (data: {
    bookingId: string;
    location: Location;
    userId: string;
    userRole: UserRole;
  }) => void;
  joinLocationRoom: (bookingId: string) => void;
  leaveLocationRoom: (bookingId: string) => void;
}

// Dashboard Stats Types
export interface DashboardStats {
  totalUsers: number;
  totalBookings: number;
  totalGarages: number;
  totalMechanics: number;
  pendingBookings: number;
  completedBookings: number;
  revenue: number;
  activeUsers: number;
}

// Error Types
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

// Generic Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Ensure this file is treated as a module
export {};
