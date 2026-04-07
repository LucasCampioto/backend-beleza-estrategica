import bcrypt from 'bcryptjs';
import { User } from '../models/user.js';

export function userToPublic(doc) {
  return {
    name: doc.name,
    email: doc.email,
    clinic: doc.clinic,
    phone: doc.phone || '',
    notifEmail: doc.notifEmail !== false,
    notifSms: doc.notifSms === true,
  };
}

export async function findUserByEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  if (!e) return null;
  return User.findOne({ email: e });
}

export async function createUser({ name, clinic, email, password }) {
  const e = String(email).toLowerCase().trim();
  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await User.create({
    email: e,
    passwordHash,
    name: String(name).trim(),
    clinic: String(clinic || '').trim(),
    phone: '',
    notifEmail: true,
    notifSms: false,
  });
  return user;
}

export async function verifyPassword(user, password) {
  return bcrypt.compare(String(password), user.passwordHash);
}

export async function updateUserById(userId, patch) {
  const allowed = ['name', 'email', 'clinic', 'phone', 'notifEmail', 'notifSms'];
  const update = {};
  for (const k of allowed) {
    if (patch[k] !== undefined) update[k] = patch[k];
  }
  if (update.email) update.email = String(update.email).toLowerCase().trim();
  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
  return user;
}

export async function findUserById(userId) {
  return User.findById(userId);
}
