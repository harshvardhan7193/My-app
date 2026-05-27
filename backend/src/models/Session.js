import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
  device: { type: String, default: 'Unknown Device' },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: Date.now },
  durationMins: { type: Number, default: 0 } // Computed: Math.round((endTime - startTime) / 60000)
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);
