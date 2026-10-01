import { HTTP_STATUS } from '../constants/index.js';

/**
 * Diccionario de errores de la API.
 * Cada entrada define el código interno (estable, pensado para que lo use el
 * cliente), el status HTTP y el mensaje por defecto.
 */
export const ERROR_DICTIONARY = Object.freeze({
  // ─── Generales ─────────────────────────────────────────────────────────────
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: 'Los datos enviados no son válidos',
  },
  INVALID_ID: {
    code: 'INVALID_ID',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: 'El identificador enviado no tiene un formato válido',
  },
  INVALID_JSON: {
    code: 'INVALID_JSON',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: 'El cuerpo de la petición no es un JSON válido',
  },
  PAYLOAD_TOO_LARGE: {
    code: 'PAYLOAD_TOO_LARGE',
    statusCode: HTTP_STATUS.PAYLOAD_TOO_LARGE,
    message: 'El cuerpo de la petición supera el tamaño máximo permitido',
  },
  ROUTE_NOT_FOUND: {
    code: 'ROUTE_NOT_FOUND',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'La ruta solicitada no existe',
  },
  DUPLICATE_KEY: {
    code: 'DUPLICATE_KEY',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'Ya existe un registro con ese valor único',
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
    message: 'No se pudo acceder a la base de datos',
  },
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Ocurrió un error inesperado en el servidor',
  },

  // ─── Recursos no encontrados ───────────────────────────────────────────────
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'El usuario solicitado no existe',
  },
  PRODUCT_NOT_FOUND: {
    code: 'PRODUCT_NOT_FOUND',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'El producto solicitado no existe',
  },
  ORDER_NOT_FOUND: {
    code: 'ORDER_NOT_FOUND',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'El pedido solicitado no existe',
  },
  DELIVERY_NOT_FOUND: {
    code: 'DELIVERY_NOT_FOUND',
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: 'La entrega solicitada no existe',
  },

  // ─── Reglas de negocio ─────────────────────────────────────────────────────
  EMAIL_ALREADY_EXISTS: {
    code: 'EMAIL_ALREADY_EXISTS',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'Ya existe un usuario registrado con ese email',
  },
  PRODUCT_CODE_ALREADY_EXISTS: {
    code: 'PRODUCT_CODE_ALREADY_EXISTS',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'Ya existe un producto con ese código',
  },
  DELIVERY_ALREADY_EXISTS: {
    code: 'DELIVERY_ALREADY_EXISTS',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'El pedido ya tiene una entrega asociada',
  },
  INVALID_ROLE: {
    code: 'INVALID_ROLE',
    statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    message: 'El usuario no tiene el rol requerido para esta operación',
  },
  INVALID_STATUS: {
    code: 'INVALID_STATUS',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: 'El estado indicado no es válido',
  },
  INVALID_STATUS_TRANSITION: {
    code: 'INVALID_STATUS_TRANSITION',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'No se puede pasar del estado actual al estado solicitado',
  },
  INVALID_STATE: {
    code: 'INVALID_STATE',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'La operación no está permitida en el estado actual del recurso',
  },
  INSUFFICIENT_STOCK: {
    code: 'INSUFFICIENT_STOCK',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'No hay stock suficiente para completar el pedido',
  },

  // ─── Mocks ─────────────────────────────────────────────────────────────────
  INVALID_MOCK_QUANTITY: {
    code: 'INVALID_MOCK_QUANTITY',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: 'La cantidad de registros a generar es inválida',
  },
  INVALID_MOCK_COLLECTION: {
    code: 'INVALID_MOCK_COLLECTION',
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: 'La colección indicada no admite datos de prueba',
  },
  MOCK_DEPENDENCY_MISSING: {
    code: 'MOCK_DEPENDENCY_MISSING',
    statusCode: HTTP_STATUS.CONFLICT,
    message: 'Faltan datos previos para generar los registros solicitados',
  },
  MOCK_SEED_FAILED: {
    code: 'MOCK_SEED_FAILED',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Falló la inserción de los datos de prueba en MongoDB',
  },
});
