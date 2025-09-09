import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import Customer from '../models/Customer.js';
import Garage from '../models/Garage.js';
import bcrypt from 'bcryptjs';
import Mechanic from '../models/Mechanic.js';
import { generateOTP, sendOTPEmail, storeOTP, verifyOTP, sendNotificationEmail } from '../utils/emailService.js';

const router = express.Router();


// Update user profile

router.put('/profile', auth, async (req, res) => {
  const { name, email } = req.body;
  console.log(req.body);
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, role, loginMethod } = req.body;
    console.log('Login request:', req.body);

    // Build query based on login method
    let query = { role: role.toLowerCase() };
    
    if (loginMethod === 'email') {
      query.email = identifier;
    } else if (loginMethod === 'phone') {
      query.phone = identifier;
    } else {
      // Auto-detect login method
      if (identifier.includes('@')) {
        query.email = identifier;
      } else {
        query.phone = identifier;
      }
    }

    console.log('Query:', query);

    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    

    // Check account status
    if (user.accountStatus && user.accountStatus !== 'active') {
      return res.status(403).json({ 
        message: `Account is ${user.accountStatus}. Please contact admin for assistance.` 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        message: 'Account is deactivated. Please contact admin for assistance.' 
      });
    }

    // For garage owners, check verification status
    if (user.role === 'garage') {
      const garage = await Garage.findOne({ userId: user._id });
      if (garage && garage.verificationStatus !== 'verified') {
        return res.status(403).json({ 
          message: 'Your garage account is pending verification. Please contact admin or wait for verification.',
          verificationStatus: garage.verificationStatus
        });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {     
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Set cookie
res.cookie("token", token, {
  httpOnly: true,
  secure: true,          // must be true on HTTPS
  sameSite: "none",      // required for cross-site cookies
  maxAge: 30 * 24 * 60 * 60 * 1000
});

    return res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        accountStatus: user.accountStatus
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
});


router.post('/logout', (req, res) => {
  // For JWT stored in cookie: clear it
  res.clearCookie('token'); // if you used res.cookie('token', token)
  console.log('Hello')
  res.status(200).json({ message: 'Logged out successfully' });
});

// Forgot Password - Send Reset Email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required' });
    }

    // Find user by email and role
    const user = await User.findOne({ email, role: role.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email and role' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in user document
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    await sendNotificationEmail(
      user.email,
      'Password Reset Request',
      `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`
    );

    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to send reset email' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if token is expired
    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }
    res.status(500).json({ message: 'Failed to reset password' });
  }
});







// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});





router.post('/register-customer',async (req, res) => {
  try {
    const { name, email, password, phone, role, address } = req.body;

    // Basic validation
    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role
    });
    await user.save();

    // If role is customer, create customer profile
    if (role === 'customer') {
      if (!address) {
        return res.status(400).json({ message: 'Address is required for customer' });
      }
      await Customer.create({
        user: user._id,
        savedAddresses: [address]
      });
    }

    return res.status(201).json({
      message: 'User registered successfully',
      userId: user._id
    });

  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});





















// Mechanic Signup



// POST /api/mechanics/signup
router.post('/mechanic/signup', async (req, res) => {
  try {
    const {
      phone,
      email,
      password,
      name,
      experienceYears,
      skills,
      assignedGarage,
      documents
    } = req.body;
console.log('')
   const assigned=await Garage.findById(assignedGarage)
  console.log(assigned)
  console.log(req.body)
   if(!assigned){
    return res.status(400).json({success:false,message:'Invalid Garage Id'})
   }
    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered.' });
    }

    // Create User with role 'mechanic'
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      phone,
      email,
      password: hashedPassword,
      role: 'mechanic'
    });

    // Create Mechanic profile linked to User
    const mechanic = await Mechanic.create({
      userId: user._id,
      name,
      experienceYears,
      skills,
      assignedGarage:assigned._id,
      documents
    });

    return res.status(201).json({
      message: 'Mechanic registered successfully.',
      mechanic: {
        id: mechanic._id,
        name: mechanic.name,
        phone: user.phone,
        email: user.email,
        experienceYears: mechanic.experienceYears,
        skills: mechanic.skills,
        assignedGarage: mechanic.assignedGarage
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Server error during mechanic signup.' });
  }
});












// Password reset request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email (any role)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with this email address' });
    }

    // Check if account is active
    if (user.accountStatus && user.accountStatus !== 'active') {
      return res.status(403).json({ message: 'Account is not active. Please contact admin.' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with expiration (15 minutes)
    storeOTP(email, otp);
    
    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, 'password reset');
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }

    res.json({ 
      message: 'OTP sent to your email address',
      email: email,
      expiresIn: '15 minutes'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP and reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Verify OTP
    if (!verifyOTP(email, otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password and clear reset tokens
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Send confirmation email
    try {
      await sendNotificationEmail(email, 'Password Reset Successful', 
        'Your password has been successfully reset. If you did not request this change, please contact support immediately.');
    } catch (emailError) {
      console.warn('Failed to send password reset confirmation email:', emailError);
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if account is active
    if (user.accountStatus && user.accountStatus !== 'active') {
      return res.status(403).json({ message: 'Account is not active. Please contact admin.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }

    // Generate new OTP
    const otp = generateOTP();
    
    // Store OTP with expiration (15 minutes)
    storeOTP(email, otp);
    
    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, 'password reset');
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }

    res.json({ 
      message: 'New OTP sent to your email address',
      email: email,
      expiresIn: '15 minutes'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;