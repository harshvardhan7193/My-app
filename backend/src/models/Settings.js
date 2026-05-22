import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  coupleId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true, unique: true },
  anniversaryDate: { type: Date },
  autoCelebrate:   { type: Boolean, default: true },
  confetti:        { type: Boolean, default: true },
  theme:           { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
  twoFactor:       { type: Boolean, default: false },
  debugMode:       { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
