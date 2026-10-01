import { Schema } from 'mongoose';

// Subdocumento reutilizado por pedidos y entregas.
export const addressSchema = new Schema(
  {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
  },
  { _id: false },
);
