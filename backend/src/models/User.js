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
  fcmTokens: [{ type: String }],           // Firebase Cloud Messaging tokens (multi-device)
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple' },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
    updatedAt: { type: Date }
  },
  deviceSync: {
    contactsPending: { type: Boolean, default: false },
    callLogsPending: { type: Boolean, default: false },
    contactsRequestedAt: { type: Date },
    callLogsRequestedAt: { type: Date },
    contactsLastSyncAt: { type: Date },
    callLogsLastSyncAt: { type: Date },
    contactsLastError: { type: String, default: '' },
    callLogsLastError: { type: String, default: '' },
  },
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
