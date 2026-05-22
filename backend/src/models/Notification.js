import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  body:         { type: String, required: true },
  target:       { type: String, enum: ['both', 'male', 'female'], default: 'both' },
  category:     { type: String, default: 'love' },
  imageUrl:     { type: String, default: '' },
  status:       { type: String, enum: ['delivered', 'failed', 'pending'], default: 'pending' },
  scheduledFor: { type: Date },
  sentAt:       { type: Date },
  opens:        { type: Number, default: 0 },
  coupleId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
}, { timestamps: true });

notificationSchema.index({ coupleId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
