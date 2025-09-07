import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['customer', 'garage', 'mechanic', 'admin'], required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  payload: { type: Object, default: {} },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }  // Use 'createdAt'
});

// Set the TTL index
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
