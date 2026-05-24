import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  coupleId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true, unique: true },
  anniversaryDate: { type: Date },
  autoCelebrate:   { type: Boolean, default: true },
  confetti:        { type: Boolean, default: true },
  theme:           { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
  twoFactor:       { type: Boolean, default: false },
  debugMode:       { type: Boolean, default: false },
  notifications: {
    pushEnabled:     { type: Boolean, default: true },
    memories:        { type: Boolean, default: true },
    stories:         { type: Boolean, default: true },
    events:          { type: Boolean, default: true },
    milestones:      { type: Boolean, default: true },
    chat:            { type: Boolean, default: true },
    adminBroadcasts: { type: Boolean, default: true },
  },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
