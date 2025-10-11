import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import Customer from '../models/Customer.js';
import Booking from '../models/Booking.js';
import Mechanic from "../models/Mechanic.js"; // Fixed: Should be Mechanic, not Booking
import User from "../models/User.js";
import Garage from "../models/Garage.js";

const router = express.Router();

// Get customer profile, bikes, and service history
router.get('/me', auth, authorize('customer'), async (req, res) => {
  try {
    // Fetch customer data
    let customer = await Customer.findOne({ user: req.user._id }).lean();
    if (!customer) {
      // Create customer if none exists
      customer = await Customer.create({ user: req.user._id, savedAddresses: [] });
      console.log('[Customers] Created new customer:', customer._id);
    }

    // Fetch bookings for the customer
    const bookings = await Booking.find({ customer: customer._id }).lean();
    console.log('[Customers] Fetched bookings for customer:', customer._id, bookings.length);

    // Extract unique bikes from bookings
    const bikes = [];
    const bikeSet = new Set();
    for (const booking of bookings) {
      const bikeKey = `${booking.brand || ''}-${booking.model || ''}-${booking.bikeNumber || ''}`;
      if (booking.brand && booking.model && booking.bikeNumber && !bikeSet.has(bikeKey)) {
        bikeSet.add(bikeKey);
        bikes.push({
          brand: booking.brand,
          model: booking.model,
          number: booking.bikeNumber,
        });
      }
    }

    // Format service history with mechanic and garage details
    const serviceHistory = await Promise.all(
      bookings.map(async (booking) => {
        let mechanicDetails = null;
        let garageDetails = null;

        // Get mechanic and garage details for non-pending bookings
        if (booking.status !== 'pending' && booking.mechanic && booking.garage) {
          try {
            // Fetch mechanic details
            const mechanic = await Mechanic.findById(booking.mechanic).lean();
            
            if (mechanic) {
              // Fetch mechanic's user details for phone number
              const mechanicUser = await User.findById(mechanic.userId).lean();
              mechanicDetails = {
                name: mechanicUser?.name || 'N/A',
                phone: mechanicUser?.phone || 'N/A'
              };
           
            }
            

            // Fetch garage details
            const garage = await Garage.findById(booking.garage).lean();
            console.log(garage.garageName)
            if (garage) {
              garageDetails = {
                name: garage.garageName || 'N/A'
              };
            }
            console.log(mechanicDetails,garageDetails,"Hello")
          } catch (error) {
            console.error('[Customers] Error fetching mechanic/garage details for booking:', booking._id, error);
          }
        }
      

        return {
          _id: booking._id,
          date: booking.scheduledDate ? new Date(booking.scheduledDate).toISOString() : null,
          type: booking.serviceType || 'N/A',
          bike: booking.brand && booking.model ? `${booking.brand} ${booking.model} (${booking.bikeNumber || 'N/A'})` : 'N/A',
          status: booking.status || 'N/A',
          details: booking.description || booking.cancelReason || 'No details provided',
          garage: garageDetails?.name || 'N/A',
          mechanic: mechanicDetails ? {
            name: mechanicDetails?.name || 'N/A',
            phone: mechanicDetails?.phone||'N/A'
          } : 'N/A',
          slot: booking.slot || 'N/A',
          location: booking.lat && booking.lon ? { lat: booking.lat, lon: booking.lon } : null,
        };
      })
    );

   
    console.log('[Customers] Fetched customer:', customer._id);
    res.status(200).json({
      _id: customer._id,
      name: req.user.name || 'N/A',
      email: req.user.email || 'N/A',
      phone: req.user.phone || 'N/A',
      savedAddresses: customer.savedAddresses || [],
      bikes,
      serviceHistory,
    });
  } catch (err) {
    console.error('[Customers] Error fetching customer:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create customer if none exists
router.post('/me', auth, authorize('customer'), async (req, res) => {
  try {
    let customer = await Customer.findOne({ user: req.user._id }).lean();
    if (!customer) {
      customer = await Customer.create({ user: req.user._id, savedAddresses: [] });
      console.log('[Customers] Created new customer:', customer._id);
    }
    res.status(200).json({
      _id: customer._id,
      savedAddresses: customer.savedAddresses || [],
    });
  } catch (err) {
    console.error('[Customers] Error creating customer:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Update customer profile (savedAddresses only)
router.put('/me', auth, authorize('customer'), async (req, res) => {
  try {
    const { savedAddresses } = req.body;
    const updateData = {};
    if (savedAddresses) updateData.savedAddresses = savedAddresses;

    const customer = await Customer.findOneAndUpdate(
      { user: req.user._id },
      { $set: updateData },
      { new: true, lean: true }
    );
    if (!customer) {
      console.log('[Customers] Customer not found for update:', req.user._id);
      return res.status(404).json({ message: 'Customer not found' });
    }

    console.log('[Customers] Updated customer:', customer._id);
    res.status(200).json({
      _id: customer._id,
      savedAddresses: customer.savedAddresses || [],
    });
  } catch (err) {
    console.error('[Customers] Error updating customer:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;