import * as z from 'zod';
import { PRODUCT_STATUS } from '../constants/index.js';
import { atLeastOneField, enumOf, paginationSchema, requiredText } from './common.validator.js';

const productFields = {
  title: requiredText('título', { max: 120 }),
  description: z.string({ error: 'La descripción debe ser un texto' }).trim().max(1000),
  code: requiredText('código', { max: 40 }).toUpperCase(),
  price: z
    .number({ error: 'El precio es obligatorio y debe ser un número' })
    .min(0, { error: 'El precio no puede ser negativo' }),
  stock: z
    .number({ error: 'El stock es obligatorio y debe ser un número' })
    .int({ error: 'El stock debe ser un número entero' })
    .min(0, { error: 'El stock no puede ser negativo' }),
  category: requiredText('categoría', { max: 60 }),
};

// El status NO se recibe: lo calcula el service a partir del stock.
export const createProductSchema = z
  .object({ ...productFields, description: productFields.description.optional() })
  .strict();

export const updateProductSchema = atLeastOneField(z.object(productFields).partial().strict());

const priceFilter = (label) =>
  z.coerce
    .number({ error: `${label} debe ser un número` })
    .min(0, { error: `${label} no puede ser negativo` })
    .optional();

export const productQuerySchema = paginationSchema.extend({
  status: enumOf(PRODUCT_STATUS, 'status').optional(),
  category: z.string().trim().min(1).optional(),
  minPrice: priceFilter('minPrice'),
  maxPrice: priceFilter('maxPrice'),
  includeOutOfStock: z
    .enum(['true', 'false'], { error: 'includeOutOfStock debe ser "true" o "false"' })
    .transform((value) => value === 'true')
    .optional(),
});
