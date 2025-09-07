import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const trackingSessionSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  locations: [locationSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
trackingSessionSchema.index({ bookingId: 1 });
trackingSessionSchema.index({ 'locations.timestamp': -1 });
trackingSessionSchema.index({ isActive: 1 });

// Method to add location
trackingSessionSchema.methods.addLocation = function(userId, latitude, longitude) {
  this.locations.push({
    userId,
    latitude,
    longitude,
    timestamp: new Date()
  });

  // Keep only last 100 locations to prevent excessive data
  if (this.locations.length > 100) {
    this.locations = this.locations.slice(-100);
  }

  return this.save();
};

// Method to get latest location for a user
trackingSessionSchema.methods.getLatestLocation = function(userId) {
  const userLocations = this.locations
    .filter(loc => loc.userId.toString() === userId.toString())
    .sort((a, b) => b.timestamp - a.timestamp);
  
  return userLocations[0] || null;
};

// Method to get all locations for a user
trackingSessionSchema.methods.getUserLocations = function(userId) {
  return this.locations
    .filter(loc => loc.userId.toString() === userId.toString())
    .sort((a, b) => a.timestamp - b.timestamp);
};

// Static method to find active tracking sessions
trackingSessionSchema.statics.findActive = function() {
  return this.find({ isActive: true }).populate('participants', 'name role');
};

// Static method to find tracking session by booking
trackingSessionSchema.statics.findByBooking = function(bookingId) {
  return this.findOne({ bookingId }).populate('participants', 'name role currentLocation');
};

export default mongoose.model('TrackingSession', trackingSessionSchema);
