import express from 'express';
import { auth,authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import TrackingSession from '../models/TrackingSession.js';

const router = express.Router();

// Update user location
router.put('/location', auth, async (req, res) => {
  try {
    const { latitude, longitude, bookingId } = req.body;
    const userId = req.user.id;

    // Validate coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Update user's current location
    await User.findByIdAndUpdate(userId, {
      currentLocation: {
        latitude,
        longitude,
        lastUpdated: new Date()
      }
    });

    // If bookingId is provided, update tracking session
    if (bookingId) {
      let trackingSession = await TrackingSession.findOne({ bookingId });
      
      if (!trackingSession) {
        trackingSession = new TrackingSession({
          bookingId,
          participants: [userId],
          locations: []
        });
      } else if (!trackingSession.participants.includes(userId)) {
        trackingSession.participants.push(userId);
      }

      // Add location to tracking history
      trackingSession.locations.push({
        userId,
        latitude,
        longitude,
        timestamp: new Date()
      });

      // Keep only last 100 locations to prevent excessive data
      if (trackingSession.locations.length > 100) {
        trackingSession.locations = trackingSession.locations.slice(-100);
      }

      await trackingSession.save();
    }

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});





// Get booking location data
router.get('/booking/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('customer', 'name email phone')
      .populate('mechanic', 'name email phone currentLocation')
      .populate('garage', 'name address location');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has access to this booking
    const userRole = req.user.role;
    const hasAccess = 
      userRole === 'admin' ||
      userRole === 'garage' ||
      booking.customer._id.toString() === userId ||
      (booking.mechanic && booking.mechanic._id.toString() === userId) ||
      (booking.garage && booking.garage._id.toString() === userId);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get tracking session
    const trackingSession = await TrackingSession.findOne({ bookingId })
      .populate('participants', 'name role currentLocation');

    // Prepare response data
    const response = {
      bookingId,
      status: booking.status,
      serviceLocation: {
        latitude: booking.lat || 0,
        longitude: booking.lon || 0,
        address: booking.address || 'Service Location'
      },
      customerLocation: null,
      mechanicLocation: null,
      estimatedArrival: null
    };

    // Add customer location if available
    if (booking.customer && booking.customer.currentLocation) {
      response.customerLocation = {
        latitude: booking.customer.currentLocation.latitude,
        longitude: booking.customer.currentLocation.longitude,
        timestamp: booking.customer.currentLocation.lastUpdated,
        userId: booking.customer._id,
        userName: booking.customer.name,
        userRole: 'customer'
      };
    }

    // Add mechanic location if available
    if (booking.mechanic && booking.mechanic.currentLocation) {
      response.mechanicLocation = {
        latitude: booking.mechanic.currentLocation.latitude,
        longitude: booking.mechanic.currentLocation.longitude,
        timestamp: booking.mechanic.currentLocation.lastUpdated,
        userId: booking.mechanic._id,
        userName: booking.mechanic.name,
        userRole: 'mechanic'
      };

      // Calculate ETA if we have both locations
      if (response.customerLocation) {
        const eta = calculateETA(
          response.mechanicLocation.latitude,
          response.mechanicLocation.longitude,
          response.customerLocation.latitude,
          response.customerLocation.longitude
        );
        response.estimatedArrival = eta;
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error getting booking location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get mechanic location
router.get('/mechanic/:mechanicId', auth, async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const userId = req.user.id;

    // Check if user has access to mechanic location
    const user = await User.findById(userId);
    const mechanic = await User.findById(mechanicId);

    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic not found' });
    }

    // Only customers with active bookings, garage owners, or admins can see mechanic location
    const hasAccess = 
      user.role === 'admin' ||
      user.role === 'garage' ||
      (user.role === 'customer' && await hasActiveBookingWithMechanic(userId, mechanicId));

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!mechanic.currentLocation) {
      return res.status(404).json({ message: 'Mechanic location not available' });
    }

    res.json({
      mechanicId,
      location: {
        latitude: mechanic.currentLocation.latitude,
        longitude: mechanic.currentLocation.longitude,
        timestamp: mechanic.currentLocation.lastUpdated
      },
      mechanic: {
        name: mechanic.name,
        phone: mechanic.phone
      }
    });
  } catch (error) {
    console.error('Error getting mechanic location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer location (for mechanics)
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.id;

    // Check if user has access to customer location
    const user = await User.findById(userId);
    const customer = await User.findById(customerId);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Only mechanics with active bookings, garage owners, or admins can see customer location
    const hasAccess = 
      user.role === 'admin' ||
      user.role === 'garage' ||
      (user.role === 'mechanic' && await hasActiveBookingWithCustomer(userId, customerId));

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!customer.currentLocation) {
      return res.status(404).json({ message: 'Customer location not available' });
    }

    res.json({
      customerId,
      location: {
        latitude: customer.currentLocation.latitude,
        longitude: customer.currentLocation.longitude,
        timestamp: customer.currentLocation.lastUpdated
      },
      customer: {
        name: customer.name,
        phone: customer.phone
      }
    });
  } catch (error) {
    console.error('Error getting customer location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start tracking session
router.post('/start/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Verify booking exists and user has access
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const hasAccess = 
      booking.customer.toString() === userId ||
      (booking.mechanic && booking.mechanic.toString() === userId) ||
      req.user.role === 'admin' ||
      req.user.role === 'garage';

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create or update tracking session
    let trackingSession = await TrackingSession.findOne({ bookingId });
    
    if (!trackingSession) {
      trackingSession = new TrackingSession({
        bookingId,
        participants: [userId],
        isActive: true,
        startedAt: new Date()
      });
    } else {
      if (!trackingSession.participants.includes(userId)) {
        trackingSession.participants.push(userId);
      }
      trackingSession.isActive = true;
    }

    await trackingSession.save();

    res.json({ message: 'Tracking started successfully' });
  } catch (error) {
    console.error('Error starting tracking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});




// Stop tracking session
router.post('/stop/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Verify booking exists and user has access
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const hasAccess = 
      booking.customer.toString() === userId ||
      (booking.mechanic && booking.mechanic.toString() === userId) ||
      req.user.role === 'admin' ||
      req.user.role === 'garage';

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update tracking session
    const trackingSession = await TrackingSession.findOne({ bookingId });
    if (trackingSession) {
      trackingSession.isActive = false;
      trackingSession.endedAt = new Date();
      await trackingSession.save();
    }

    res.json({ message: 'Tracking stopped successfully' });
  } catch (error) {
    console.error('Error stopping tracking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tracking history
router.get('/history/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Verify booking exists and user has access
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const hasAccess = 
      booking.customer.toString() === userId ||
      (booking.mechanic && booking.mechanic.toString() === userId) ||
      req.user.role === 'admin' ||
      req.user.role === 'garage';

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get tracking session with populated user data
    const trackingSession = await TrackingSession.findOne({ bookingId })
      .populate('participants', 'name role');

    if (!trackingSession) {
      return res.json([]);
    }

    // Format location history
    const history = trackingSession.locations.map(location => ({
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
      userId: location.userId,
      userName: trackingSession.participants.find(p => p._id.toString() === location.userId.toString())?.name || 'Unknown',
      userRole: trackingSession.participants.find(p => p._id.toString() === location.userId.toString())?.role || 'unknown'
    }));

    res.json(history);
  } catch (error) {
    console.error('Error getting tracking history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate ETA
function calculateETA(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  
  // Assume average speed of 30 km/h for mechanics
  const timeInHours = distance / 30;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  if (timeInMinutes < 60) {
    return `${timeInMinutes} minutes`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
}

// Helper function to check if customer has active booking with mechanic
async function hasActiveBookingWithMechanic(customerId, mechanicId) {
  const booking = await Booking.findOne({
    customer: customerId,
    mechanic: mechanicId,
    status: { $in: ['accepted', 'assigned', 'on-way', 'arrived', 'working'] }
  });
  return !!booking;
}

// Helper function to check if mechanic has active booking with customer
async function hasActiveBookingWithCustomer(mechanicId, customerId) {
  const booking = await Booking.findOne({
    mechanic: mechanicId,
    customer: customerId,
    status: { $in: ['accepted', 'assigned', 'on-way', 'arrived', 'working'] }
  });
  return !!booking;
}


// In your routes/bookings.js or a dedicated tracking route file






// PUT /api/bookings/update-tracking
// Updates mechanic's location in the booking's trackingData.mechanicLocation
// Can auto-detect active booking or use provided bookingId
router.get('/update-tracking', auth,authorize('mechanic'), async (req, res) => {
   try {
    const { latitude, longitude, bookingId } = req.body;
    console.log(req.body)
    const mechanicId = req.user.id; // From auth middleware (mechanic's ObjectId)
 
    // Validate coordinates
    if (
      typeof latitude !== 'number' ||
      latitude < -90 ||
      latitude > 90 ||
      typeof longitude !== 'number' ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.',
      });
    }

    // Find the booking: either by provided bookingId or auto-detect active one for this mechanic
    let query = {
      mechanic: mechanicId,
      status: { $in: ['assigned'] }, // Only for active/on-going bookings
    };
    if (bookingId) {
      query._id = bookingId;
    }

    const booking = await Booking.findOne(query);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: bookingId
          ? 'Booking not found or not accessible.'
          : 'No active booking found for this mechanic.',
      });
    }

    // Ensure trackingData exists
    if (!booking.trackingData) {
      booking.trackingData = {};
    }

    // Update mechanicLocation
    booking.trackingData.mechanicLocation = {
      latitude,
      longitude,
    };

    // Optional: Add a status update to the updates array (e.g., 'location_updated')
    booking.trackingData.updates = booking.trackingData.updates || [];
    booking.trackingData.updates.push({
      status: 'location_updated',
      timestamp: new Date(),
    });

    // Optional: Set startTime if not set (when tracking begins)
    if (!booking.trackingData.startTime) {
      booking.trackingData.startTime = new Date();
    }

    await booking.save();

    // Optional: Emit real-time update via Socket.IO to notify customer
    // Assuming you have Socket.IO server attached to req.io or global io
    if (req.io) {
      req.io.to(`customer:${booking.customer}`).emit('mechanicLocationUpdate', {
        bookingId: booking._id,
        location: { latitude, longitude },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Mechanic location updated successfully.',
      data: {
        bookingId: booking._id,
        location: { latitude, longitude },
      },
    });
  } catch (error) {
    console.error('Update tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating location.',
    });
  }
});





export default router;
