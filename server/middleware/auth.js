import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Garage from '../models/Garage.js';


export const auth = async (req, res, next) => {
  try {
    // Get token from cookie instead of header
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user and attach to request
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    if (user.role === "garage") {
      const garage = await Garage.findOne({ userId: user._id });
      if (garage) {
        user.garageId = garage._id;
      }
    }
 
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};


export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Forbidden. You do not have permission to access this resource.' 
      });
    }
    next();
  };
};
