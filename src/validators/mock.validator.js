import * as z from 'zod';
import { MOCK_COLLECTIONS, MOCKS, USER_ROLES } from '../constants/index.js';
import {
  InvalidMockCollectionError,
  InvalidMockQuantityError,
  ValidationError,
} from '../errors/index.js';
import { enumOf } from './common.validator.js';

const NUMERIC_REGEX = /^-?\d+(\.\d+)?$/;

/**
 * Convierte y valida una cantidad recibida por query o body.
 * - Si no viene, usa el valor por defecto.
 * - Rechaza: textos no numéricos, valores repetidos, negativos, decimales,
 *   menores al mínimo o mayores al máximo permitido.
 */
export const parseMockQuantity = (
  raw,
  { field = 'qty', min = 1, max = MOCKS.MAX_QTY, defaultValue = MOCKS.DEFAULT_QTY } = {},
) => {
  if (raw === undefined || raw === null || raw === '') return defaultValue;

  const fail = (reason) =>
    new InvalidMockQuantityError(`"${field}" ${reason}`, { field, received: raw, min, max });

  if (typeof raw !== 'number' && typeof raw !== 'string') {
    throw fail('debe ser un único valor numérico');
  }
  const text = String(raw).trim();
  if (!NUMERIC_REGEX.test(text)) throw fail(`debe ser un número entero (recibido: "${raw}")`);

  const value = Number(text);
  if (value < 0) throw fail('no puede ser negativo');
  if (!Number.isInteger(value)) throw fail('debe ser un número entero, sin decimales');
  if (value < min) throw fail(`debe ser como mínimo ${min}`);
  if (value > max) throw fail(`no puede superar ${max}`);
  return value;
};

const DATASET_KEYS = Object.keys(MOCKS.DATASET_DEFAULTS);

/**
 * Cantidades para generar un set de datos relacionado
 * ({ users, couriers, products, orders }). Cada una admite 0.
 */
export const parseDatasetCounts = (source = {}) => {
  const unknown = Object.keys(source).filter((key) => !DATASET_KEYS.includes(key));
  if (unknown.length > 0) {
    throw new ValidationError(
      unknown.map((key) => ({
        field: key,
        message: `Campo no reconocido. Campos permitidos: ${DATASET_KEYS.join(', ')}`,
      })),
    );
  }

  const counts = {};
  for (const key of DATASET_KEYS) {
    counts[key] = parseMockQuantity(source[key], {
      field: key,
      min: 0,
      defaultValue: MOCKS.DATASET_DEFAULTS[key],
    });
  }

  if (Object.values(counts).every((value) => value === 0)) {
    throw new InvalidMockQuantityError('Tenés que pedir al menos un registro', { received: counts });
  }
  if (counts.orders > 0 && (counts.users === 0 || counts.products === 0)) {
    throw new InvalidMockQuantityError(
      'Para generar pedidos hacen falta al menos 1 usuario (cliente) y 1 producto',
      { received: counts },
    );
  }
  return counts;
};

export const parseMockCollection = (raw) => {
  const allowed = Object.values(MOCK_COLLECTIONS);
  if (raw === undefined || raw === '') return MOCK_COLLECTIONS.USERS;
  if (typeof raw !== 'string' || !allowed.includes(raw)) {
    throw new InvalidMockCollectionError(raw, allowed);
  }
  return raw;
};

export const mockUsersQuerySchema = z.object({
  role: enumOf(USER_ROLES, 'role').optional(),
});
