import { config } from '../config/env.config.js';
import { createAppLogger } from '../config/logger.config.js';

/**
 * Logger único de la aplicación. Se importa desde cualquier archivo:
 *   import { logger } from '../utils/logger.js';
 *   logger.info('mensaje');  logger.warning('...');  logger.fatal('...');
 *
 * - development: consola (con colores) + archivos, desde nivel debug.
 * - production:  solo archivos, desde nivel info.
 * - test:        solo archivos, desde nivel info (la consola queda limpia para Mocha).
 */
export const logger = createAppLogger({
  level: config.logLevel,
  logDir: config.logDir,
  console: config.isDevelopment,
});
