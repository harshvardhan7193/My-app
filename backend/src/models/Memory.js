import mongoose from 'mongoose';

const memorySchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  date:       { type: Date, default: Date.now },
  category:   { type: String, enum: ['Dates', 'Trips', 'Milestones', 'Favorites'], default: 'Favorites' },
  description:{ type: String, default: '' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  favorite:   { type: Boolean, default: false },
  img:        { type: String, required: true },      // Cloudinary URL
  imgPublicId:{ type: String, default: '' },          // Cloudinary public_id for deletion
  coupleId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
}, { timestamps: true });

// Index for efficient queries
memorySchema.index({ coupleId: 1, date: -1 });
memorySchema.index({ coupleId: 1, category: 1 });

export default mongoose.model('Memory', memorySchema);
