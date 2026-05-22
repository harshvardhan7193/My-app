import mongoose from 'mongoose';

const highlightSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  coverUrl:   { type: String, required: true },
  coupleId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stories:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
}, { timestamps: true });

// Index for fast query
highlightSchema.index({ coupleId: 1, createdAt: -1 });

export default mongoose.model('Highlight', highlightSchema);
