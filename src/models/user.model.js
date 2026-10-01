import { Schema, model } from 'mongoose';
import { USER_ROLES, VEHICLE_TYPES } from '../constants/index.js';

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
      index: true,
    },
    phone: { type: String, trim: true },
    // Solo aplica a repartidores (role = courier)
    vehicleType: { type: String, enum: Object.values(VEHICLE_TYPES) },
  },
  { timestamps: true, versionKey: false },
);

export const UserModel = model('User', userSchema, 'users');
