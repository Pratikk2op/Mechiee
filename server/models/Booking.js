import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  garage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garage'
  },
  mechanic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mechanic'
  },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  serviceType: { type: String, required: true },
  
  slot: { type: String },
  bikeNumber: { type: String, required: true },
  address: { type: String, required: true },
  description: { type: String },
  lat: { type: Number},
  lon: { type: Number},
  
  price: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },

  status: {
    type: String,
    enum: ['pending' ,'assigned', 'completed', 'cancelled','billed'],
    default: 'pending'
  },
  // Core references
 
  // Customer details
  
 
  

  // Status & scheduling
  scheduledDate: {
    type: Date,
    default:Date.now()
  },
  scheduledTime: {
    type: String,
    validate: {
      validator: function(value) {
        if (this.serviceLocation?.type === 'emergency') {
          return !value || value.trim() === '';
        }
        return typeof value === 'string' && value.trim() !== '';
      },
      message: 'Scheduled time is required for non-emergency services and must be empty for emergency services.'
    }
  },
  // Location of service
 



  // Payment fields
  totalAmount: { type: Number, default: 0 },
  
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'cash', 'wallet'],
    default: 'cash'
  },
  paymentId: { type: String },

  // Ratings & reviews
  rating: {
    score: { type: Number, min: 0, max: 5, default: null },
    review: { type: String },
    createdAt: { type: Date }
  },

  // Tracking & updates
  trackingData: {
    startTime: Date,
    endTime: Date,
    mechanicLocation: {
      latitude: Number,
      longitude: Number
    },
    updates: [{
      status: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },

  // Cancellation
  cancelReason: { type: String, default: null },

  // Track which garages rejected this booking
  rejectedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garage'
  }]

}, { timestamps: true });

// Business rule for emergency fallback
bookingSchema.pre('validate', function(next) {
  if (this.serviceLocation?.type === 'emergency') {
    this.scheduledDate = this.createdAt || new Date();
  } else if (!this.scheduledDate) {
    return next(new Error('Scheduled date is required for non-emergency services.'));
  }
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
