import mongoose from 'mongoose';

const mechanicSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  experienceYears: {
    type: Number,
    default: 0
  },
  skills: {
    type: [String],
    default: []
  },
  assignedGarage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garage'
  },
  currentBookings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    }
  ],
  isAvailable: {
    type: Boolean,
    default: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  documents: {
    aadhar: { type: String },
    license: { type: String }
  }
}, {
  timestamps: true
});

mechanicSchema.index({ location: '2dsphere' });

export default mongoose.model('Mechanic', mechanicSchema);
