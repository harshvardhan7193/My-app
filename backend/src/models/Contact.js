import mongoose from 'mongoose';

const phoneSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  number: { type: String, required: true },
}, { _id: false });

const emailSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  address: { type: String, required: true },
}, { _id: false });

const contactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
  deviceContactId: { type: String, required: true },
  displayName: { type: String, default: '' },
  phones: { type: [phoneSchema], default: [] },
  emails: { type: [emailSchema], default: [] },
  lastSyncedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

contactSchema.index({ userId: 1, deviceContactId: 1 }, { unique: true });
contactSchema.index({ coupleId: 1, userId: 1, isActive: 1 });
contactSchema.index({ coupleId: 1, displayName: 1 });

export default mongoose.model('Contact', contactSchema);
