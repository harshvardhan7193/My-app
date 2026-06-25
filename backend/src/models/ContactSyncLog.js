import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema({
  action: { type: String, enum: ['added', 'updated', 'removed'], required: true },
  deviceContactId: { type: String, required: true },
  displayName: { type: String, default: '' },
}, { _id: false });

const contactSyncLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
  syncedAt: { type: Date, default: Date.now },
  device: { type: String, default: 'Unknown Device' },
  summary: {
    total: { type: Number, default: 0 },
    added: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    removed: { type: Number, default: 0 },
  },
  changes: { type: [changeSchema], default: [] },
}, { timestamps: true });

contactSyncLogSchema.index({ coupleId: 1, syncedAt: -1 });
contactSyncLogSchema.index({ coupleId: 1, userId: 1, syncedAt: -1 });

export default mongoose.model('ContactSyncLog', contactSyncLogSchema);
