import mongoose from 'mongoose';

const photoSchema = new mongoose.Schema({
  img:        { type: String, required: true },      // Cloudinary URL
  publicId:   { type: String, default: '' },
  mediaType:  { type: String, enum: ['image', 'video'], default: 'image' },
  uploadedAt: { type: Date, default: Date.now },
  deletedAt:  { type: Date, default: null },
  deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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

  // Private album: hidden from the public album list, only listed inside
  // the "vault" (which itself requires the account password to enter), and
  // gated behind a per-album numeric PIN to actually open. pinHash stores a
  // bcrypt hash of the PIN and is never returned to the client.
  isPrivate:   { type: Boolean, default: false },
  pinHash:     { type: String, default: '', select: false },
  pinPlain:    { type: String, default: '', select: false },
  deletedAt:   { type: Date, default: null },
  deletedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Virtual for photo count (non-deleted only)
albumSchema.virtual('count').get(function () {
  return (this.photos || []).filter((p) => !p.deletedAt).length;
});

albumSchema.set('toJSON', { virtuals: true });
albumSchema.set('toObject', { virtuals: true });
albumSchema.index({ coupleId: 1 });

export default mongoose.model('Album', albumSchema);
