import { Schema, model } from 'mongoose';
import { DELIVERY_STATUS } from '../constants/index.js';
import { addressSchema } from './schemas/address.schema.js';

const statusHistorySchema = new Schema(
  {
    status: { type: String, enum: Object.values(DELIVERY_STATUS), required: true },
    note: { type: String, trim: true, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const deliverySchema = new Schema(
  {
    // Un pedido tiene como máximo una entrega
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    courier: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    trackingCode: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: Object.values(DELIVERY_STATUS),
      default: DELIVERY_STATUS.PENDING,
      index: true,
    },
    address: { type: addressSchema, required: true },
    estimatedDeliveryDate: { type: Date, required: true },
    deliveredAt: { type: Date, default: null },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const DeliveryModel = model('Delivery', deliverySchema, 'deliveries');
