import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role:     { type: String, enum: ['male', 'female', 'admin'], required: true },
  location: { type: String, default: '' },
  birthday: { type: Date },
  avatar:   { type: String, default: '' },           // Cloudinary URL
  mood:     { type: String, default: '' },
  bio:      { type: String, default: '', maxlength: 200 },
  preferredTheme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
  fcmToken: { type: String, default: '' },           // Firebase Cloud Messaging token
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple' },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Exclude sensitive fields in JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

export default mongoose.model('User', userSchema);
