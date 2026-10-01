import { RouteNotFoundError } from '../errors/index.js';

// Cualquier ruta que no matcheó ninguna definida termina acá.
export const notFoundHandler = (req, res, next) => {
  next(new RouteNotFoundError(req.method, req.originalUrl));
};
