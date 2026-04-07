import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    clinic: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    notifEmail: { type: Boolean, default: true },
    notifSms: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
