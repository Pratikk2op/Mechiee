import express from 'express';
import Garage from '../models/Garage.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
// Import will be handled dynamically to avoid circular dependency
import { sendNotificationEmail } from '../utils/emailService.js';

const router = express.Router();
import { extractLatLngFromMapLinkUniversal } from '../helper/latlongExtract.js';
import { authorize,auth } from '../middleware/auth.js';

// read all garages
// router.get('/', async (req, res) => {
//   try {
//     const garages = await Garage.find();
//     res.status(200).json({ garages });
//     co
//   } catch (err) {
//     console.error("Garage list error:", err);
//     res.status(500).json({ 
//       message: "Internal server error",
//       error: err.message
//     });  
//   }
// });








/**
 * Get garage details by ID
 */
router.get('/',auth,authorize('garage'), async (req, res) => {
  try {
    

    const garage = await Garage.find({userId:req.user._id});


   if (!garage) {

      return res.status(404).json({ message: "Garage not found" });
    }

   return res.status(200).json({ 
      message: "Garage fetched successfully",
      garage
    });


  } catch (err) {
    console.error("Garage read error:", err);
    res.status(500).json({ 
      message: "Internal server error",
      error: err.message
    });
  }
});









router.post('/register', async (req, res) => {
  try {
    
    const {
      name, email, password, phone,
      garageName, registrationNumber, garageType,
      address, mapLink, openingTime, weeklyOff, experience,
      doorstepService, specialization, employeesCount,
      serviceablePincodes,altPhone,
      accountHolder, accountNumber, ifsc,
      ownerPhoto,
      addressProof, aadharPan, signature,cancelledCheque
      
      
    } = req.body;

    // ✅ Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // ✅ Create new user with role 'garage'
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'garage'
    });
    await user.save();

    // ✅ Extract coordinates
    const extracted = await extractLatLngFromMapLinkUniversal(mapLink);
    if (!extracted) {
      return res.status(400).json({ message: "Invalid map link. Could not extract coordinates." });
    }

    // ✅ Create garage record linked to user
    const garage = new Garage({
      userId: user._id,
      garageName,
      registrationNumber,
      garageType,
      address,
      mapLink,
      openingTime,
      weeklyOff,
      experience,
      doorstepService: doorstepService === 'true',
      specialization,
      employeesCount: parseInt(employeesCount),
      serviceablePincodes: serviceablePincodes
        ? serviceablePincodes.split(',').map(p => p.trim())
        : [],
      ownerName:name,
      ownerPhone:phone,
      altPhone,
      email,
      accountHolder,
      accountNumber,
      ifsc,
      ownerPhoto,
      addressProof, aadharPan, signature, accountHolder,cancelledCheque,


      location: {
        type: "Point",
        coordinates: [extracted.lng, extracted.lat]
      }
    });
    await garage.save();

    // ✅ Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Send notification to admin about new garage registration
    try {
      await sendNotification({
        role: 'admin',
        type: 'garage:registration',
        message: `New garage registration: ${garageName} by ${name}`,
        payload: { 
          garageId: garage._id,
          userId: user._id,
          garageName,
          ownerName: name,
          email
        }
      });

      // Send email notification to admin
      const adminUsers = await User.find({ role: 'admin' });
      for (const admin of adminUsers) {
        await sendNotificationEmail(
          admin.email,
          'New Garage Registration - Mechiee',
          `
            <h3>New Garage Registration</h3>
            <p><strong>Garage Name:</strong> ${garageName}</p>
            <p><strong>Owner Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Address:</strong> ${address}</p>
            <p>Please review and verify this garage registration.</p>
          `
        );
      }
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }

    res.status(201).json({
      message: "Garage registered successfully. Your account is pending verification by admin.",
      token,
      user,
      garage
    });

  } catch (err) {
    console.error("Garage register error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // ✅ Check role is garage (adjust as needed)
    if (user.role !== 'garage') {
      return res.status(403).json({ message: 'Not authorized. This is not a garage account.' });
    }

    // ✅ Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // ✅ Fetch garage profile
    const garageProfile = await Garage.findOne({ userId: user._id });
    if (!garageProfile) {
      return res.status(404).json({ message: 'Garage profile not found for this user' });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // ✅ Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // send only on HTTPS
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
      message: 'Garage login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      garage: garageProfile
    });

  } catch (err) {
    console.error("Garage login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});





router.put('/', async (req, res) => {
  try {
    const garageId = req.params.id;
    const updateData = { ...req.body };

    // 🔥 If a new mapLink is provided, try extracting coordinates
    if (updateData.mapLink) {
      const extracted = await extractLatLngFromMapLinkUniversal(updateData.mapLink);

      if (!extracted) {
        return res.status(400).json({ 
          message: "Invalid map link. Could not extract coordinates."
        });
      }

      updateData.location = {
        type: "Point",
        coordinates: [extracted.lng, extracted.lat]
      };
    }

    // 🛠 Update the garage
    const updatedGarage = await Garage.findByIdAndUpdate(
      garageId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedGarage) {
      return res.status(404).json({ message: "Garage not found" });
    }

    res.status(200).json({
      message: "Garage updated successfully",
      garage: updatedGarage
    });

  } catch (err) {
    console.error("Garage update error:", err);
    res.status(500).json({ 
      message: "Internal server error", 
      error: err.message 
    });
  }
});













export default router;
