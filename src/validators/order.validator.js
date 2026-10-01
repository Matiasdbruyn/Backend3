import * as z from 'zod';
import { ORDER_PRIORITY, ORDER_STATUS } from '../constants/index.js';
import {
  addressSchema,
  atLeastOneField,
  enumOf,
  objectId,
  paginationSchema,
} from './common.validator.js';

const orderItemSchema = z.object({
  productId: objectId('productId'),
  quantity: z
    .number({ error: 'La cantidad es obligatoria y debe ser un número' })
    .int({ error: 'La cantidad debe ser un número entero' })
    .min(1, { error: 'La cantidad debe ser al menos 1' }),
});

const notesField = z.string({ error: 'Las notas deben ser un texto' }).trim().max(500);

export const createOrderSchema = z
  .object({
    userId: objectId('userId'),
    items: z
      .array(orderItemSchema, { error: 'items es obligatorio y debe ser una lista' })
      .min(1, { error: 'El pedido debe tener al menos un ítem' }),
    priority: enumOf(ORDER_PRIORITY, 'La prioridad').default(ORDER_PRIORITY.NORMAL),
    shippingAddress: addressSchema,
    notes: notesField.optional(),
  })
  .strict();

// Mientras el pedido está pendiente se pueden cambiar estos datos.
// Para cambiar productos hay que cancelar y generar un pedido nuevo.
export const updateOrderSchema = atLeastOneField(
  z
    .object({
      priority: enumOf(ORDER_PRIORITY, 'La prioridad'),
      shippingAddress: addressSchema,
      notes: notesField,
    })
    .partial()
    .strict(),
);

export const orderStatusSchema = z
  .object({ status: z.string({ error: 'El estado (status) es obligatorio' }).trim() })
  .strict();

export const orderQuerySchema = paginationSchema.extend({
  status: enumOf(ORDER_STATUS, 'status').optional(),
  priority: enumOf(ORDER_PRIORITY, 'priority').optional(),
  userId: objectId('userId').optional(),
});
