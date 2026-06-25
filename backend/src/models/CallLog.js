import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
  deviceCallId: { type: String, required: true },
  phoneNumber: { type: String, default: '' },
  contactName: { type: String, default: '' },
  callType: {
    type: String,
    enum: ['incoming', 'outgoing', 'missed', 'rejected', 'blocked', 'voicemail', 'unknown'],
    default: 'unknown',
  },
  durationSecs: { type: Number, default: 0 },
  calledAt: { type: Date, required: true },
  lastSyncedAt: { type: Date, default: Date.now },
}, { timestamps: true });

callLogSchema.index({ userId: 1, deviceCallId: 1 }, { unique: true });
callLogSchema.index({ coupleId: 1, userId: 1, calledAt: -1 });
callLogSchema.index({ coupleId: 1, calledAt: -1 });

export default mongoose.model('CallLog', callLogSchema);
