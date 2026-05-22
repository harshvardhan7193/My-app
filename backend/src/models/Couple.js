import mongoose from 'mongoose';

const coupleSchema = new mongoose.Schema({
  maleUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  femaleUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:       { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

export default mongoose.model('Couple', coupleSchema);
