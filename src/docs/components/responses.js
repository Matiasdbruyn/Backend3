import { DatabaseError, AppError, ERROR_DICTIONARY } from '../../errors/index.js';

const EXAMPLE_TIMESTAMP = '2026-10-27T15:00:00.000Z';
const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });

/**
 * Arma un ejemplo de respuesta de error a partir de una instancia REAL de
 * los errores personalizados: código, status y mensaje coinciden con lo que
 * devuelve el middleware global.
 */
export const errorExample = (error, { path, method = 'GET', key } = {}) => ({
  key: key ?? error.code,
  summary: `${error.code}: ${error.message}`,
  value: {
    status: 'error',
    statusCode: error.statusCode,
    code: error.code,
    message: error.message,
    ...(error.details !== undefined && { details: error.details }),
    path,
    method,
    timestamp: EXAMPLE_TIMESTAMP,
  },
});

/** Respuesta de error con uno o más ejemplos (todos del mismo status HTTP). */
export const errorResponse = (description, examples) => ({
  description,
  content: {
    'application/json': {
      schema: schemaRef('ErrorResponse'),
      examples: Object.fromEntries(
        examples.map(({ key, summary, value }) => [key, { summary, value }]),
      ),
    },
  },
});

/**
 * Respuesta exitosa: { status: 'success', message?, payload, pagination? }.
 * `list: true` indica que payload es un array paginado.
 */
export const successResponse = (description, payloadSchema, { list = false, paginated = list } = {}) => {
  const payload = list ? { type: 'array', items: schemaRef(payloadSchema) } : schemaRef(payloadSchema);
  const properties = { payload };
  if (paginated) properties.pagination = schemaRef('Pagination');

  return {
    description,
    content: {
      'application/json': {
        schema: { allOf: [schemaRef('SuccessResponse'), { type: 'object', properties }] },
      },
    },
  };
};

export const jsonBody = (schemaName, { required = true, description } = {}) => ({
  required,
  ...(description && { description }),
  content: { 'application/json': { schema: schemaRef(schemaName) } },
});

// ─── Respuestas reutilizables (components.responses) ─────────────────────────

export const responses = {
  InternalError: errorResponse('Error inesperado del servidor (no expone detalles internos)', [
    errorExample(new AppError(ERROR_DICTIONARY.INTERNAL_SERVER_ERROR), { path: '/api/...' }),
  ]),
  DatabaseUnavailable: errorResponse('MongoDB no está disponible', [
    errorExample(new DatabaseError(), { path: '/api/...' }),
  ]),
};

export const responseRef = (name) => ({ $ref: `#/components/responses/${name}` });

// Errores que puede devolver cualquier endpoint que consulta la base
export const commonErrors = {
  500: responseRef('InternalError'),
  503: responseRef('DatabaseUnavailable'),
};
