import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';

/**
 * Formato único de respuesta exitosa:
 * { status: 'success', message?, payload, pagination? }
 * (las respuestas de error las arma exclusivamente el middleware global).
 */
export const sendSuccess = (res, { statusCode = HTTP_STATUS.OK, message, payload, pagination } = {}) => {
  const body = { status: RESPONSE_STATUS.SUCCESS };
  if (message) body.message = message;
  body.payload = payload;
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
};
