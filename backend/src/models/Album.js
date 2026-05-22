import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema({
  img:        { type: String, required: true },      // Cloudinary URL
  publicId:   { type: String, default: '' },
  mediaType:  { type: String, enum: ['image', 'video'], default: 'image' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const albumSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  cover:       { type: String, default: '' },         // Cloudinary URL
  coverPublicId: { type: String, default: '' },
  date:        { type: Date, default: Date.now },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coupleId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
  photos:      [photoSchema],
}, { timestamps: true });

// Virtual for photo count
albumSchema.virtual('count').get(function () {
  return this.photos.length;
});

albumSchema.set('toJSON', { virtuals: true });
albumSchema.set('toObject', { virtuals: true });
albumSchema.index({ coupleId: 1 });

export default mongoose.model('Album', albumSchema);
