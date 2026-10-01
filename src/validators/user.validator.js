import * as z from 'zod';
import { USER_ROLES, VEHICLE_TYPES } from '../constants/index.js';
import {
  atLeastOneField,
  emailField,
  enumOf,
  paginationSchema,
  requiredText,
} from './common.validator.js';

const userFields = {
  firstName: requiredText('nombre', { max: 80 }),
  lastName: requiredText('apellido', { max: 80 }),
  email: emailField,
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(6, { error: 'La contraseña debe tener al menos 6 caracteres' })
    .max(100, { error: 'La contraseña admite como máximo 100 caracteres' }),
  role: enumOf(USER_ROLES, 'El rol'),
  phone: requiredText('teléfono', { max: 30 }),
  vehicleType: enumOf(VEHICLE_TYPES, 'El tipo de vehículo'),
};

export const createUserSchema = z
  .object({
    ...userFields,
    role: userFields.role.default(USER_ROLES.USER),
    phone: userFields.phone.optional(),
    vehicleType: userFields.vehicleType.optional(),
  })
  .strict();

// Sin defaults: en un update solo viaja lo que el cliente mandó.
export const updateUserSchema = atLeastOneField(z.object(userFields).partial().strict());

export const userQuerySchema = paginationSchema.extend({
  role: userFields.role.optional(),
});
