import * as z from 'zod';
import { DELIVERY_STATUS } from '../constants/index.js';
import { enumOf, objectId, paginationSchema } from './common.validator.js';

export const createDeliverySchema = z
  .object({
    orderId: objectId('orderId'),
    courierId: objectId('courierId').optional(),
    estimatedDeliveryDate: z.coerce
      .date({ error: 'estimatedDeliveryDate debe ser una fecha válida (ISO 8601)' })
      .optional(),
  })
  .strict();

export const assignCourierSchema = z.object({ courierId: objectId('courierId') }).strict();

export const deliveryStatusSchema = z
  .object({
    status: z.string({ error: 'El estado (status) es obligatorio' }).trim(),
    note: z.string({ error: 'La nota debe ser un texto' }).trim().max(300).optional(),
  })
  .strict();

export const deliveryQuerySchema = paginationSchema.extend({
  status: enumOf(DELIVERY_STATUS, 'status').optional(),
  courierId: objectId('courierId').optional(),
});
