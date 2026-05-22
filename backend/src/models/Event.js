import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  date:     { type: Date, required: true },
  title:    { type: String, required: true, trim: true },
  type:     { type: String, enum: ['date', 'trip', 'birthday', 'milestone'], default: 'date' },
  time:     { type: String, default: '' },
  location: { type: String, default: '' },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', required: true },
}, { timestamps: true });

eventSchema.index({ coupleId: 1, date: 1 });

export default mongoose.model('Event', eventSchema);
