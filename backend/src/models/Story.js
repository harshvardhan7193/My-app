import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  mediaUrl:   { type: String, required: true },
  mediaType:  { type: String, enum: ['image', 'video'], default: 'image' },
  caption:    { type: String, default: '', trim: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coupleId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
  views:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt:  { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
}, { timestamps: true });

// Indexes for fast queries
storySchema.index({ coupleId: 1, expiresAt: 1 });
storySchema.index({ coupleId: 1, createdAt: -1 });

// TTL index — MongoDB deletes documents when expiresAt < now (checked roughly every 60s)
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Story', storySchema);
