import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
  action: { type: String, required: true }, // e.g. "Opened the app", "Created a memory", "Sent a message"
  category: { type: String, enum: ['auth', 'chat', 'memory', 'album', 'event', 'milestone', 'recap', 'settings', 'other'], default: 'other' },
  device: { type: String, default: 'Unknown Device' },
}, { timestamps: true });

export default mongoose.model('ActivityLog', activityLogSchema);
