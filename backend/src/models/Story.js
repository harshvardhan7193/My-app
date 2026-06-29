import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  mediaUrl:   { type: String, required: true },
  mediaType:  { type: String, enum: ['image', 'video'], default: 'image' },
  caption:    { type: String, default: '', trim: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coupleId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
  views:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likes:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions:  [{
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji:     { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  }],
  expiresAt:  { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  deletedAt:  { type: Date, default: null },
  deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Indexes for fast queries
storySchema.index({ coupleId: 1, expiresAt: 1 });
storySchema.index({ coupleId: 1, createdAt: -1 });



export default mongoose.model('Story', storySchema);
