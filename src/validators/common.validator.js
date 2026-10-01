import * as z from 'zod';
import { PAGINATION } from '../constants/index.js';
import { ValidationError } from '../errors/index.js';
import { isValidObjectId } from '../utils/ids.js';

// Mensajes por defecto de Zod en español (se usan cuando no definimos uno propio).
z.config(z.locales.es());

/**
 * Valida `data` contra un schema de Zod. Si falla lanza un ValidationError
 * con el detalle de cada campo; si pasa devuelve los datos ya normalizados.
 */
export const validate = (schema, data) => {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw new ValidationError(result.error.issues.flatMap(toFieldErrors));
  }
  return result.data;
};

const toFieldErrors = (issue) => {
  const prefix = issue.path.length > 0 ? `${issue.path.join('.')}.` : '';
  // Campos que el schema no admite (por ejemplo, mandar "status" al crear un producto)
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map((key) => ({ field: `${prefix}${key}`, message: 'Campo no permitido' }));
  }
  return [{ field: issue.path.join('.') || 'body', message: issue.message }];
};

// ─── Bloques reutilizables ───────────────────────────────────────────────────

export const requiredText = (label, { max = 200 } = {}) =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? `El campo "${label}" es obligatorio`
          : `El campo "${label}" debe ser un texto`,
    })
    .trim()
    .min(1, { error: `El campo "${label}" no puede estar vacío` })
    .max(max, { error: `El campo "${label}" admite como máximo ${max} caracteres` });

export const objectId = (label) =>
  z
    .string({ error: `${label} es obligatorio` })
    .refine(isValidObjectId, { error: `${label} no es un identificador válido` });

export const enumOf = (constants, label) => {
  const values = Object.values(constants);
  return z.enum(values, { error: `${label} debe ser uno de: ${values.join(', ')}` });
};

export const emailField = z
  .string({ error: 'El email es obligatorio' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'El email no tiene un formato válido' }));

export const addressSchema = z.object(
  {
    street: requiredText('calle'),
    city: requiredText('ciudad', { max: 100 }),
    zipCode: requiredText('código postal', { max: 20 }),
  },
  { error: 'La dirección es obligatoria y debe ser un objeto { street, city, zipCode }' },
);

// Query params de paginación (?page=1&limit=10)
export const paginationSchema = z.object({
  page: z.coerce
    .number({ error: 'page debe ser un número' })
    .int({ error: 'page debe ser un número entero' })
    .min(1, { error: 'page debe ser mayor o igual a 1' })
    .default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number({ error: 'limit debe ser un número' })
    .int({ error: 'limit debe ser un número entero' })
    .min(1, { error: 'limit debe ser mayor o igual a 1' })
    .max(PAGINATION.MAX_LIMIT, { error: `limit no puede superar ${PAGINATION.MAX_LIMIT}` })
    .default(PAGINATION.DEFAULT_LIMIT),
});

// Para updates parciales: exige al menos un campo en el body.
export const atLeastOneField = (schema) =>
  schema.refine((data) => Object.keys(data).length > 0, {
    error: 'Debe enviar al menos un campo para actualizar',
  });
