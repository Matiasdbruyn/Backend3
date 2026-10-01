import { Schema, model } from 'mongoose';
import { ORDER_PRIORITY, ORDER_STATUS } from '../constants/index.js';
import { addressSchema } from './schemas/address.schema.js';

// Cada ítem guarda una "foto" del producto (título y precio) al momento de la compra.
const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, 'El pedido debe tener al menos un ítem'],
    },
    priority: {
      type: String,
      enum: Object.values(ORDER_PRIORITY),
      default: ORDER_PRIORITY.NORMAL,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    shippingAddress: { type: addressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true, versionKey: false },
);

export const OrderModel = model('Order', orderSchema, 'orders');
