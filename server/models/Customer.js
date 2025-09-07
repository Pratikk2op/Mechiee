import mongoose from 'mongoose';

const savedAddressSchema = new mongoose.Schema({
  label: {
    type: String,
    
    trim: true
  },
  street: {
    type: String,
    required: true, 
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  zipCode: {
    type: String,
    required: true,
    trim: true
  },
  latitude: {
    type: Number,
   
  },
  longitude: {
    type: Number,
    required: true
  }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // enforce 1 customer profile per user
  },
  savedAddresses: {
    type: [savedAddressSchema],
    default: [],
    validate: v => Array.isArray(v)
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
