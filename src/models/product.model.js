import { Schema, model } from 'mongoose';
import { PRODUCT_STATUS } from '../constants/index.js';

const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.AVAILABLE,
    },
  },
  { timestamps: true, versionKey: false },
);

productSchema.index({ status: 1, category: 1 });

export const ProductModel = model('Product', productSchema, 'products');
