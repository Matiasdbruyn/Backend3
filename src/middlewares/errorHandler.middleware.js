import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';
import {
  AppError,
  DatabaseError,
  DuplicateKeyError,
  ERROR_DICTIONARY,
  InvalidIdError,
  InvalidJsonError,
  PayloadTooLargeError,
  ValidationError,
} from '../errors/index.js';
import { logger } from '../utils/logger.js';

const DATABASE_ERROR_NAMES = [
  'MongoNetworkError',
  'MongoServerSelectionError',
  'MongooseServerSelectionError',
  'MongoNotConnectedError',
];

/**
 * Traduce cualquier error a un AppError. Los errores de librerías se
 * detectan por nombre/código (sin importar Mongoose en esta capa).
 */
const normalizeError = (err) => {
  if (err instanceof AppError) return err;

  // Errores de express.json()
  if (err.type === 'entity.parse.failed') return new InvalidJsonError();
  if (err.type === 'entity.too.large') return new PayloadTooLargeError(err.limit);

  // Errores de Mongoose / MongoDB que se hayan escapado de los services
  if (err.name === 'CastError') return new InvalidIdError(err.value, err.path);
  if (err.name === 'ValidationError' && err.errors) {
    return new ValidationError(
      Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    );
  }
  if (err.code === 11000) return new DuplicateKeyError(err.keyValue, err);
  if (DATABASE_ERROR_NAMES.includes(err.name) || /buffering timed out/i.test(err.message)) {
    return new DatabaseError(err);
  }

  return new AppError(ERROR_DICTIONARY.INTERNAL_SERVER_ERROR, { cause: err });
};

/**
 * - Errores esperados / de negocio (4xx): warning. Son problemas del cliente.
 * - Errores del servidor (5xx): error, con el stack del error original.
 */
const logError = (error, req) => {
  const where = `${req.method} ${req.originalUrl} → ${error.statusCode} ${error.code}`;

  if (error.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    const original = error.cause ?? error;
    logger.error(`${where}: ${original.message}`, { stack: original.stack });
    return;
  }
  const meta = error.details !== undefined ? { details: error.details } : {};
  logger.warning(`${where}: ${error.message}`, meta);
};

/**
 * Middleware global de errores: es el ÚNICO lugar de la app que arma
 * respuestas de error. Siempre responde con la misma estructura JSON.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);
  logError(error, req);

  if (res.headersSent) return next(err);

  const body = {
    status: RESPONSE_STATUS.ERROR,
    statusCode: error.statusCode,
    code: error.code,
    message: error.message,
  };
  if (error.details !== undefined) body.details = error.details;
  body.path = req.originalUrl;
  body.method = req.method;
  body.timestamp = new Date().toISOString();

  res.status(error.statusCode).json(body);
};
