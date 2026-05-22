import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  date:     { type: String, required: true },
  title:    { type: String, required: true, trim: true },
  desc:     { type: String, default: '' },
  icon:     { type: String, default: 'Heart' },
  color:    { type: String, default: '#F4D3D3' },
  image:    { type: String, default: '' },            // Cloudinary URL
  order:    { type: Number, default: 0 },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
}, { timestamps: true });

milestoneSchema.index({ coupleId: 1, order: 1 });

export default mongoose.model('Milestone', milestoneSchema);
