import mongoose from 'mongoose';

const recapSlideSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  subtitle: { type: String, default: '' },
  img:      { type: String, default: '' },             // Cloudinary URL
  quote:    { type: String, default: '' },
  order:    { type: Number, default: 0 },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
}, { timestamps: true });

recapSlideSchema.index({ coupleId: 1, order: 1 });

export default mongoose.model('RecapSlide', recapSlideSchema);
