import mongoose from 'mongoose';

const callLogSyncLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
  syncedAt: { type: Date, default: Date.now },
  device: { type: String, default: 'Unknown Device' },
  daysWindow: { type: Number, default: 10 },
  summary: {
    total: { type: Number, default: 0 },
    added: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    pruned: { type: Number, default: 0 },
  },
}, { timestamps: true });

callLogSyncLogSchema.index({ coupleId: 1, syncedAt: -1 });
callLogSyncLogSchema.index({ coupleId: 1, userId: 1, syncedAt: -1 });

export default mongoose.model('CallLogSyncLog', callLogSyncLogSchema);
