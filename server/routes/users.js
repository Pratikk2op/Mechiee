import express from 'express';
import User from '../models/User.js';
import { auth, authorize } from '../middleware/auth.js';
import Garage from '../models/Garage.js';
import Mechanic from '../models/Mechanic.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get garages
router.get('/garages', auth, async (req, res) => {
  try {
    const garages = await User.find({ role: 'garage', isActive: true }).select('-password');
    res.json(garages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get mechanics for a garage
router.get('/mechanics', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const garage = await Garage.findOne({ userId: userId });

    if (!garage) {
      return res.status(404).json({ message: 'Garage not found' });
    }

    const mechanics = await Mechanic.find({ assignedGarage: garage._id })
      .populate('userId', 'email phone'); // Populate userId and select only email & phone

    res.json(mechanics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a mechanic (garage owners only)
router.delete('/mechanics/:mechanicId', auth, async (req, res) => {
  try {
    // Check if user is a garage owner
    if (req.user.role !== 'garage') {
      return res.status(403).json({ message: 'Only garage owners can delete mechanics' });
    }

    const userId = req.user._id || req.user.id;
    const garage = await Garage.findOne({ userId: userId });
    if (!garage) {
      return res.status(404).json({ message: 'Garage not found' });
    }

    const mechanic = await Mechanic.findById(req.params.mechanicId);
    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic not found' });
    }

    // Check if mechanic belongs to this garage
    if (mechanic.assignedGarage.toString() !== garage._id.toString()) {
      return res.status(403).json({ message: 'Mechanic does not belong to this garage' });
    }

    await Mechanic.findByIdAndDelete(req.params.mechanicId);
    res.json({ message: 'Mechanic deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password update here
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update mechanic location
router.put('/location', auth, authorize('mechanic'), async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { currentLocation: { latitude, longitude } },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;