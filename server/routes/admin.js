import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Admin from "../models/Admin.js"
import Booking from '../models/Booking.js';
import Garage from '../models/Garage.js';
import Mechanic from '../models/Mechanic.js';
import Customer from '../models/Customer.js';
import bcrypt from "bcryptjs"
// Import will be handled dynamically to avoid circular dependency
import { sendNotificationEmail } from '../utils/emailService.js';

const router = express.Router();




router.post('/register',async (req, res) => {
  try {
    const { name, email, password, phone} = req.body;

    // Basic validation
    if (!name || !email || !password || !phone ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      phone,
    });
    await admin.save();
    

    return res.status(201).json({
      message: 'User registered successfully',
      userId: admin._id
    });

  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});


// Helper function to send notifications via socket
const sendNotificationViaSocket = (io, { userId, role, type, message, payload = {} }) => {
  try {
    if (userId) {
      io.to(userId.toString()).emit('notification', { 
        type, 
        message, 
        payload, 
        timestamp: new Date() 
      });
    } else if (role) {
      io.to(role).emit('notification', { 
        type, 
        message, 
        payload, 
        timestamp: new Date() 
      });
    }
  } catch (err) {
    console.error('Failed to send notification via socket:', err);
  }
};

// Get dashboard stats
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const [
      totalUsers,
      totalBookings,
      totalGarages,
      totalMechanics,
      pendingBookings,
      completedBookings,
      activeUsers
    ] = await Promise.all([
      User.countDocuments(),
      Booking.countDocuments(),
      Garage.countDocuments(),
      Mechanic.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'completed' }),
      User.countDocuments({ isActive: true })
    ]);

    // Calculate total revenue
    const completedBookingsData = await Booking.find({ status: 'completed' });
    const totalRevenue = completedBookingsData.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

    res.json({
      totalUsers,
      totalBookings,
      totalGarages,
      totalMechanics,
      pendingBookings,
      completedBookings,
      totalRevenue,
      activeUsers
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// Get all users
router.get('/users', auth, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get all bookings
router.get('/bookings', auth, authorize('admin'), async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('customer', 'name')
      .populate('garage', 'garageName')
      .populate('mechanic', 'name')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get all garages
router.get('/garages', auth, authorize('admin'), async (req, res) => {
  try {
    const garages = await Garage.find({}).sort({ createdAt: -1 });
    res.json(garages);
  } catch (error) {
    console.error('Error fetching garages:', error);
    res.status(500).json({ message: 'Failed to fetch garages' });
  }
});

// Get all mechanics
router.get('/mechanics', auth, authorize('admin'), async (req, res) => {
  try {
    const mechanics = await Mechanic.find({}).sort({ createdAt: -1 });
    res.json(mechanics);
  } catch (error) {
    console.error('Error fetching mechanics:', error);
    res.status(500).json({ message: 'Failed to fetch mechanics' });
  }
});

// User management
router.put('/users/:userId/activate', auth, authorize('admin'), async (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) return res.status(500).json({ message: 'Socket server error' });
     console.log( "user id", req.params.userId)
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive: true },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    sendNotificationViaSocket(io, {
      userId: user._id,
      type: 'account:activated',
      message: 'Your account has been activated by admin',
      payload: { userId: user._id }
    });

    res.json({ message: 'User activated successfully', user });
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ message: 'Failed to activate user' });
  }
});

router.put('/users/:userId/deactivate', auth, authorize('admin'), async (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) return res.status(500).json({ message: 'Socket server error' });

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { 
        isActive: false,
        accountStatus: 'suspended'
      },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    sendNotificationViaSocket(io, {
      userId: user._id,
      type: 'account:deactivated',
      message: 'Your account has been deactivated by admin',
      payload: { userId: user._id }
    });

    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
});

// Garage verification routes
router.put('/garages/:garageId/verify', auth, authorize('admin'), async (req, res) => {
  try {
    const garage = await Garage.findByIdAndUpdate(
      req.params.garageId,
      { 
        verificationStatus: 'verified',
        verificationDate: new Date(),
        verifiedBy: req.user.id
      },
      { new: true }
    ).populate('userId', 'name email');

    if (!garage) {
      return res.status(404).json({ message: 'Garage not found' });
    }

    // Update user verification status
    await User.findByIdAndUpdate(
      garage.userId._id,
      { 
        isVerified: true,
        accountStatus: 'active'
      }
    );

    // Send notification to garage owner
    const io = req.app.get('io');
    if (io) {
      sendNotificationViaSocket(io, {
        userId: garage.userId._id,
        type: 'garage:verified',
        message: 'Your garage has been verified by admin. You can now accept bookings.',
        payload: { garageId: garage._id }
      });
    }

    // Send email notification
    await sendNotificationEmail(
      garage.userId.email,
      'Garage Verified - Mechiee',
      `
        <h3>Congratulations! Your garage has been verified.</h3>
        <p><strong>Garage Name:</strong> ${garage.garageName}</p>
        <p>Your garage account has been verified by our admin team. You can now:</p>
        <ul>
          <li>Accept customer bookings</li>
          <li>Manage your services</li>
          <li>Receive payments</li>
        </ul>
        <p>Welcome to Mechiee!</p>
      `
    );

    res.json({ message: 'Garage verified successfully', garage });
  } catch (error) {
    console.error('Error verifying garage:', error);
    res.status(500).json({ message: 'Failed to verify garage' });
  }
});

router.put('/garages/:garageId/reject', auth, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    
    const garage = await Garage.findByIdAndUpdate(
      req.params.garageId,
      { 
        verificationStatus: 'rejected',
        verificationDate: new Date(),
        verifiedBy: req.user.id
      },
      { new: true }
    ).populate('userId', 'name email');

    if (!garage) {
      return res.status(404).json({ message: 'Garage not found' });
    }

    // Send notification to garage owner
    // await sendNotification({
    //   userId: garage.userId._id,
    //   role: 'garage',
    //   type: 'garage:rejected',
    //   message: `Your garage verification was rejected. Reason: ${reason || 'Documentation incomplete'}`,
    //   payload: { garageId: garage._id, reason }
    // });

    // Send email notification
    await sendNotificationEmail(
      garage.userId.email,
      'Garage Verification Rejected - Mechiee',
      `
        <h3>Garage Verification Update</h3>
        <p><strong>Garage Name:</strong> ${garage.garageName}</p>
        <p>Unfortunately, your garage verification has been rejected.</p>
        <p><strong>Reason:</strong> ${reason || 'Documentation incomplete'}</p>
        <p>Please review your application and submit the required documents again.</p>
        <p>If you have any questions, please contact our support team.</p>
      `
    );

    res.json({ message: 'Garage rejected successfully', garage });
  } catch (error) {
    console.error('Error rejecting garage:', error);
    res.status(500).json({ message: 'Failed to reject garage' });
  }
});

// Get pending garage verifications
router.get('/garages/pending', auth, authorize('admin'), async (req, res) => {
  try {
    const pendingGarages = await Garage.find({ verificationStatus: 'pending' })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    
    res.json(pendingGarages);
  } catch (error) {
    console.error('Error fetching pending garages:', error);
    res.status(500).json({ message: 'Failed to fetch pending garages' });
  }
});

// Account management routes
router.put('/users/:userId/suspend', auth, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { 
        accountStatus: 'suspended',
        isActive: false
      },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // await sendNotification({
    //   userId: user._id,
    //   role: user.role,
    //   type: 'account:suspended',
    //   message: `Your account has been suspended. Reason: ${reason || 'Policy violation'}`,
    //   payload: { userId: user._id, reason }
    // });

    res.json({ message: 'User suspended successfully', user });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ message: 'Failed to suspend user' });
  }
});

router.put('/users/:userId/reactivate', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { 
        accountStatus: 'active',
        isActive: true
      },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // await sendNotification({
    //   userId: user._id,
    //   role: user.role,
    //   type: 'account:reactivated',
    //   message: 'Your account has been reactivated by admin',
    //   payload: { userId: user._id }
    // });

    res.json({ message: 'User reactivated successfully', user });
  } catch (error) {
    console.error('Error reactivating user:', error);
    res.status(500).json({ message: 'Failed to reactivate user' });
  }
});

router.delete('/users/:userId', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Booking management
router.put('/bookings/:bookingId/approve', auth, authorize('admin'), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status: 'accepted' },
      { new: true }
    ).populate('customer', 'user');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Notify customer
    if (booking.customer?.user) {
      // await sendNotification({
      //   userId: booking.customer.user,
      //   role: 'customer',
      //   type: 'booking:approved',
      //   message: 'Your booking has been approved by admin',
      //   payload: { bookingId: booking._id }
      // });
    }

    res.json({ message: 'Booking approved successfully', booking });
  } catch (error) {
    console.error('Error approving booking:', error);
    res.status(500).json({ message: 'Failed to approve booking' });
  }
});

router.put('/bookings/:bookingId/reject', auth, authorize('admin'), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status: 'cancelled' },
      { new: true }
    ).populate('customer', 'user');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Notify customer
    if (booking.customer?.user) {
      // await sendNotification({
      //   userId: booking.customer.user,
      //   role: 'customer',
      //   type: 'booking:rejected',
      //   message: 'Your booking has been rejected by admin',
      //   payload: { bookingId: booking._id }
      // });
    }

    res.json({ message: 'Booking rejected successfully', booking });
  } catch (error) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({ message: 'Failed to reject booking' });
  }
});

router.put('/bookings/:bookingId/cancel', auth, authorize('admin'), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status: 'cancelled' },
      { new: true }
    ).populate('customer', 'user');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Notify customer
    if (booking.customer?.user) {
      // await sendNotification({
      //   userId: booking.customer.user,
      //   role: 'customer',
      //   type: 'booking:cancelled',
      //   message: 'Your booking has been cancelled by admin',
      //   payload: { bookingId: booking._id }
      // });
    }

    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

export default router;