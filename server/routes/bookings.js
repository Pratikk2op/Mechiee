// routes/bookings.js
import express from 'express';
import Booking from '../models/Booking.js';
import { auth, authorize } from '../middleware/auth.js';
import Garage from '../models/Garage.js';
import Customer from '../models/Customer.js';
import Mechanic from '../models/Mechanic.js';
import { getDistanceFromLatLonInKm } from '../utils/geo.js';
// Import will be handled dynamically to avoid circular dependency
import { ChatSession } from '../models/Chat.js';
import mongoose from 'mongoose';

const router = express.Router();

// Helper function to send notifications via socket
const sendNotificationViaSocket = async (io, { userId, role, type, message, payload = {} }) => {
  try {
    // Import Notification model dynamically to avoid circular dependency
    const { default: Notification } = await import('../models/Notification.js');
    
    // Create notification in database
    const notification = new Notification({
      user: userId,
      role: role || 'customer', // Default role if not specified
      type,
      message,
      payload,
      read: false
    });
    
    await notification.save();
    
    // Emit to socket
    if (userId) {
      io.to(userId.toString()).emit('notification', { 
        id: notification._id,
        type, 
        message, 
        payload, 
        timestamp: new Date(),
        read: false
      });
    } else if (role) {
      io.to(role).emit('notification', { 
        id: notification._id,
        type, 
        message, 
        payload, 
        timestamp: new Date(),
        read: false
      });
    }
  } catch (err) {
    console.error('Failed to send notification via socket:', err);
  }
};


/**
 * GET /pending
 * Fetch pending bookings for garage owners within their service area
 */
router.get('/pending', auth, authorize('garage'), async (req, res) => {
  try {
    const garage = await Garage.findOne({ userId: req.user.id });
    if (!garage) {
      return res.status(404).json({ message: 'Garage not found' });
    }

    // Get garage location
    const garageLat = garage.location?.coordinates?.[1];
    const garageLon = garage.location?.coordinates?.[0];

    if (!garageLat || !garageLon) {
      return res.status(400).json({ message: 'Garage location not set' });
    }

    // Find all pending bookings within 5km radius
    const allBookings = await Booking.find({ status: 'pending' })
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });

    const nearbyPendingBookings = allBookings.filter(booking => {
      if (!booking.lat || !booking.lon) return false;
      const distance = getDistanceFromLatLonInKm(garageLat, garageLon, booking.lat, booking.lon);
      return distance <= 5; // 5km radius
    });

    res.json(nearbyPendingBookings);
  } catch (error) {
    console.error('Error fetching pending bookings:', error);
    res.status(500).json({ message: 'Failed to fetch pending bookings' });
  }
});

/**
 * POST /reject
 * Garage owner rejects a booking
 */
router.post('/reject', auth, authorize('garage'), async (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) return res.status(500).json({ message: 'Socket server error' });

    const garage = await Garage.findOne({ userId: req.user.id });
    if (!garage) return res.status(404).json({ message: 'Garage not found' });

    const { bookingId, reason } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    // Check if booking exists and is still pending
    const booking = await Booking.findOne({ _id: bookingId, status: 'pending' });
    if (!booking) {
      return res.status(400).json({ message: 'Booking not found or already processed' });
    }

    // Add garage to rejected garages list (optional - for tracking)
    await Booking.findByIdAndUpdate(bookingId, {
      $addToSet: { rejectedBy: garage._id }
    });

    // Notify customer about rejection (optional)
    const customerDoc = await Customer.findById(booking.customer);
    if (customerDoc && customerDoc.user) {
      await sendNotificationViaSocket(io, {
        userId: customerDoc.user,
        type: 'booking:rejected',
        message: `Your booking was rejected by ${garage.garageName}`,
        payload: { bookingId: booking._id, garageName: garage.garageName, reason }
      });
    }

    // Emit rejection event to all garages in the area
    io.to('garage').emit('bookingRejected', {
      bookingId: booking._id,
      rejectedBy: garage._id,
      garageName: garage.garageName,
      reason
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Booking rejected successfully' 
    });
  } catch (error) {
    console.error('Reject Booking Error:', error);
    return res.status(500).json({ message: 'Failed to reject booking', error: error.message });
  }
});

/**
 * POST /book
 * Create a booking and notify nearby garages within 5 km radius
 */
router.post('/book', auth, authorize('customer'), async (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) return res.status(500).json({ message: 'Socket server error' });

    const {
      address, bikeNumber, brand, date, description, mobile,
      model, name, serviceType, slot, lat, lon
    } = req.body;

    // Validate required inputs
    if (!address || !bikeNumber || !brand || !mobile || !model || !name || !serviceType || !slot || lat == null || lon == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find nearby garages within 5 km using distance util
    const garages = await Garage.find({});
    const nearbyGarages = garages.filter(garage => {
      if (!garage.location?.coordinates) return false;
      const [lng, glat] = garage.location.coordinates;
      const dist = getDistanceFromLatLonInKm(glat, lng, lat, lon);
      return dist <= 5;  // 5 km radius
    });

    if (nearbyGarages.length === 0) {
      return res.status(404).json({ message: 'No garages found within 5 km.' });
    }

    // Get the customer document
    const customer = await Customer.findOne({ user: req.user.id });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Create booking with notifiedGarages list
    const booking = await Booking.create({
      customer: customer._id,
      name,
      mobile,
      brand,
      model,
      serviceType,
      slot,
      bikeNumber,
      address,
      description,
      date,
      lat,
      lon,
      status: 'pending',
      notifiedGarages: nearbyGarages.map(g => g._id), // track notified garages
    });

    // Create empty chat session for this booking (if does not exist)
    await ChatSession.findOneAndUpdate(
      { bookingId: booking._id.toString() },
      { $setOnInsert: { bookingId: booking._id.toString(), messages: [] } },
      { upsert: true, new: true }
    );

    // Emit new booking request and send notification to each nearby garage owner
    for (const garage of nearbyGarages) {
      // Emit to individual garage socket
      io.to(garage._id.toString()).emit('newBookingRequest', {
        bookingId: booking._id,
        customerId: customer._id,
        customerName: name,
        brand,
        model,
        bikeNumber,
        serviceType,
        scheduledDate: date,
        slot,
        address,
        description,
        location: { lat, lon },
      });

      // Also emit to garage room for real-time updates
      io.to('garage').emit('newBookingRequest', {
        bookingId: booking._id,
        customerId: customer._id,
        customerName: name,
        brand,
        model,
        bikeNumber,
        serviceType,
        scheduledDate: date,
        slot,
        address,
        description,
        location: { lat, lon },
      });

      await sendNotificationViaSocket(io, {
        userId: garage.userId,
        type: 'booking:new',
        message: `New booking request from ${name}`,
        payload: {
          bookingId: booking._id,
          customerName: name,
          serviceType,
          scheduledDate: date,
          slot,
        }
      });
    }


    // Notify customer that booking request was sent
    await sendNotificationViaSocket(io, {
      userId: req.user.id,
      type: 'booking:created',
      message: 'Your booking request has been sent to nearby garages.',
      payload: { bookingId: booking._id }
    });

    // Optionally, notify admin
    await sendNotificationViaSocket(io, {
      role: 'admin',
      type: 'booking:created',
      message: `A new booking was created by ${name}`,
      payload: { bookingId: booking._id, customerName: name }
    });

    return res.status(200).json({
      message: 'Booking request sent to nearby garages.',
      bookingId: booking._id,
      customerId: booking.customer,
      data: booking
    });
  } catch (err) {
    console.error('Booking creation error:', err);
    return res.status(500).json({ message: 'Server error initiating booking' });
  }
});


/**
 * POST /accept
 * Garage owner accepts a booking, assigns mechanic, and notify all relevant parties
 */
router.post('/accept', auth, authorize('garage'), async (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) return res.status(500).json({ message: 'Socket server error' });

    const garage = await Garage.findOne({ userId: req.user.id });
    if (!garage) return res.status(404).json({ message: 'Garage not found' });

    const { bookingId, mechanicId } = req.body;
    if (!bookingId || !mechanicId) {
      return res.status(400).json({ message: 'Booking ID and Mechanic ID are required' });
    }

    // Atomically update booking: only accept if still pending
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, status: 'pending' },
      { status: 'accepted', garage: garage._id, mechanic: mechanicId },
      { new: true }
    );

    if (!booking) {
      return res.status(400).json({ message: 'Booking not found or already accepted' });
    }

    // Emit booking accepted event to all garages to remove from their pending lists
    io.to('garage').emit('bookingAccepted', {
      bookingId: booking._id,
      acceptedBy: garage._id,
      garageName: garage.garageName,
      mechanicId
    });

    const mechanic = await Mechanic.findById(mechanicId);
    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic not found' });
    }

    // Emit bookingAccepted event to all in booking room to update their UI
    io.to(`booking_${booking._id}`).emit('bookingAccepted', {
      bookingId: booking._id,
      garageId: garage._id,
      mechanicId,
    });

    // Get customer user ID for notification
    const customerDoc = await Customer.findById(booking.customer);
    if (customerDoc && customerDoc.user) {
      // Notify customer about acceptance
      await sendNotificationViaSocket(io, {
        userId: customerDoc.user,
        type: 'booking:accepted',
        message: `Your booking was accepted by ${garage.garageName}`,
        payload: { bookingId: booking._id, garageName: garage.garageName }
      });
    }

    // Get mechanic user ID for notification
    const mechanicDoc = await Mechanic.findById(mechanicId);
    if (mechanicDoc && mechanicDoc.userId) {
      // Notify mechanic about assignment
      await sendNotificationViaSocket(io, {
        userId: mechanicDoc.userId,
        type: 'booking:assigned',
        message: 'You have been assigned a new job.',
        payload: { bookingId: booking._id, garageName: garage.garageName }
      });
    }

    // Notify garage about successful acceptance
    await sendNotificationViaSocket(io, {
      userId: garage.userId,
      type: 'booking:accepted',
      message: `You accepted booking ${booking._id}`,
      payload: { bookingId: booking._id }
    });

    // Optionally notify admin
    await sendNotificationViaSocket(io, {
      role: 'admin',
      type: 'booking:accepted',
      message: `Booking ${booking._id} was accepted by ${garage.garageName}`,
      payload: { bookingId: booking._id, garageName: garage.garageName }
    });

    return res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error('Accept Booking Error:', error);
    return res.status(500).json({ message: 'Failed to accept booking', error: error.message });
  }
});


/**
 * GET /
 * Fetch bookings filtered by logged in user's role
 */


router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    const userId = req.user._id || req.user.id;
    
    switch (req.user.role) {
      case 'customer':
        // For customers, find bookings where they are the customer
        filter.customer = userId;
        break;
      case 'garage':
        // For garage owners, find bookings assigned to their garage
        const garage = await Garage.findOne({ userId: userId });
        if (!garage) {
          return res.status(404).json({ message: 'Garage not found' });
        }
        filter.garage = garage._id;
        break;
      case 'mechanic':
        // For mechanics, find bookings assigned to them
        filter.mechanic = userId;
        break;
      case 'admin':
        // Admin can see all bookings
        break;
      default:
        return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const bookings = await Booking.find(filter)
      .populate('customer', 'name phone')
      .populate('garage', 'garageName phone userId')
      .populate('mechanic', 'name phone user userId')
      .sort({ createdAt: -1 });
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get("/mechanic", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const mechanic = await Mechanic.findOne({ userId });

    if (!mechanic) {
      return res.json({
        success: false,
        message: "No mechanic found",
      });
    }

    // Use mechanic._id for filtering
    const bookings = await Booking.find({ mechanic: mechanic._id });
    const pendingBookings = await Booking.find({
      mechanic: mechanic._id,
      status: "pending",
    });

    return res.json({
      success: true,
      message: "Mechanic data found",
      bookings,
      pendingBookings,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});



/**
 * PUT /:id/status
 * Update booking status & optionally mechanic assignment
 */

router.put('/:id/status', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) return res.status(500).json({ message: 'Socket server error' });

    const { status, mechanicId } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Permission check
    if (req.user.role === 'garage' && booking.garage?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (req.user.role === 'mechanic' && booking.mechanic?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Update status & mechanic if given
    booking.status = status;
    if (mechanicId) booking.mechanic = mechanicId;

    await booking.save();

    // Send notifications for status changes
    if (status === 'completed') {
      // Notify customer about completion
      const customerDoc = await Customer.findById(booking.customer);
      if (customerDoc && customerDoc.user) {
        await sendNotificationViaSocket(io, {
          userId: customerDoc.user,
          type: 'booking:completed',
          message: 'Your service has been completed! Please rate your experience.',
          payload: { bookingId: booking._id }
        });
      }

      // Notify garage about completion
      const garageDoc = await Garage.findById(booking.garage);
      if (garageDoc && garageDoc.userId) {
        await sendNotificationViaSocket(io, {
          userId: garageDoc.userId,
          type: 'booking:completed',
          message: `Booking ${booking._id} has been completed.`,
          payload: { bookingId: booking._id }
        });
      }
    } else if (status === 'cancelled') {
      // Notify customer about cancellation
      const customerDoc = await Customer.findById(booking.customer);
      if (customerDoc && customerDoc.user) {
        await sendNotificationViaSocket(io, {
          userId: customerDoc.user,
          type: 'booking:cancelled',
          message: 'Your booking has been cancelled.',
          payload: { bookingId: booking._id }
        });
      }

      // Notify garage about cancellation
      const garageDoc = await Garage.findById(booking.garage);
      if (garageDoc && garageDoc.userId) {
        await sendNotificationViaSocket(io, {
          userId: garageDoc.userId,
          type: 'booking:cancelled',
          message: `Booking ${booking._id} has been cancelled.`,
          payload: { bookingId: booking._id }
        });
      }
    }

    return res.json(booking);
  } catch (error) {
    console.error('Status update error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});


/**
 * PUT /:id/rating
 * Customer rates completed booking
 */

router.put('/:id/rating', auth, authorize('customer'), async (req, res) => {
  try {
    const { score, review } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user.id });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed bookings' });
    }

    booking.rating = {
      score,
      review,
      createdAt: new Date(),
    };

    await booking.save();

    return res.json(booking);
  } catch (error) {
    console.error('Rating update error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
