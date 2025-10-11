import mongoose from 'mongoose';

const GarageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  garageName: { type: String },
  registrationNumber: { type: String },
  garageType: { type: String }, // e.g. "Two-Wheeler"

  address: { type: String },
  mapLink: { type: String },

  // For geo-based search
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },

  openingTime: { type: String },  // e.g. "09:00"
  weeklyOff: { type: String },    // e.g. "Sunday"
  experience: { type: String },   // e.g. "8 years"

  doorstepService: { type: Boolean, default: false },
  specialization: { type: String }, // e.g. "Honda, Bajaj"
  employeesCount: { type: Number },

  serviceablePincodes: { type: [String], default: [] },

  // Owner details (redundant display copies)
  ownerName: { type: String },
  ownerPhone: { type: String },
  altPhone: { type: String },
  email: { type: String, trim: true, lowercase: true },

  // KYC documents stored as filenames or URLs
  ownerPhoto: { type: String },
  addressProof: { type: String },
  aadharPan: { type: String },
  signature: { type: String },

  // Bank details for payouts
  accountHolder: { type: String },
  accountNumber: { type: String },
  ifsc: { type: String },
  cancelledCheque: { type: String },

  // Ratings & reviews summary
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },

  // Business performance stats
  totalBookings: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },

  // Approval / workflow
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationDate: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }

}, { timestamps: true });


// Indexes
GarageSchema.index({ location: "2dsphere" }); // for geo queries
GarageSchema.index({ serviceablePincodes: 1 }); // optimize pin code filter

export default mongoose.model('Garage', GarageSchema);
