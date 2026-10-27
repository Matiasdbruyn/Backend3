import path from 'node:path';
import dotenv from 'dotenv';
import {
  DEFAULT_LOG_DIR,
  DEFAULT_LOG_LEVEL_BY_ENV,
  LOG_LEVELS,
  NODE_ENVS,
} from '../constants/index.js';
import { closeLogger, createAppLogger } from './logger.config.js';

// Único lugar del proyecto que lee process.env.
// Los tests usan su propio archivo (.env.test) para no mezclarse con desarrollo.
const ENV_FILE = process.env.NODE_ENV === NODE_ENVS.TEST ? '.env.test' : '.env';
dotenv.config({ path: ENV_FILE, quiet: true });

const REQUIRED_VARS = ['PORT', 'MONGODB_URI', 'NODE_ENV'];

/**
 * Valida las variables de entorno y devuelve un objeto de configuración
 * inmutable. Si falta algo crítico lanza un error descriptivo.
 * Recibe el objeto de entorno por parámetro para poder probarla aislada.
 */
export const loadConfig = (env) => {
  const missing = REQUIRED_VARS.filter((key) => !env[key] || env[key].trim() === '');
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(', ')}.\n` +
        `  Copiá el archivo .env.example como ${ENV_FILE} y completá los valores.`,
    );
  }

  const errors = [];
  const port = Number(env.PORT);
  const mongoUri = env.MONGODB_URI.trim();
  const nodeEnv = env.NODE_ENV.trim();
  const allowedEnvs = Object.values(NODE_ENVS);
  const allowedLogLevels = Object.keys(LOG_LEVELS);
  const logLevel = env.LOG_LEVEL?.trim() || DEFAULT_LOG_LEVEL_BY_ENV[nodeEnv];

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`PORT debe ser un número entero entre 1 y 65535 (recibido: "${env.PORT}")`);
  }
  if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
    errors.push('MONGODB_URI debe comenzar con "mongodb://" o "mongodb+srv://"');
  }
  if (!allowedEnvs.includes(nodeEnv)) {
    errors.push(`NODE_ENV debe ser uno de: ${allowedEnvs.join(', ')} (recibido: "${nodeEnv}")`);
  } else if (!allowedLogLevels.includes(logLevel)) {
    errors.push(`LOG_LEVEL debe ser uno de: ${allowedLogLevels.join(', ')} (recibido: "${logLevel}")`);
  }
  if (errors.length > 0) {
    throw new Error(`Variables de entorno inválidas:\n  - ${errors.join('\n  - ')}`);
  }

  return Object.freeze({
    port,
    mongoUri,
    nodeEnv,
    isProduction: nodeEnv === NODE_ENVS.PRODUCTION,
    isDevelopment: nodeEnv === NODE_ENVS.DEVELOPMENT,
    isTest: nodeEnv === NODE_ENVS.TEST,
    logLevel,
    logDir: path.resolve(env.LOG_DIR?.trim() || DEFAULT_LOG_DIR),
  });
};

// Fail fast: si la configuración es inválida la app no arranca. Como todavía
// no hay configuración válida, el error fatal se registra con un logger de
// arranque (consola + archivos en la carpeta por defecto).
export const config = await (async () => {
  try {
    return loadConfig(process.env);
  } catch (error) {
    const bootLogger = createAppLogger({
      level: 'debug',
      logDir: path.resolve(DEFAULT_LOG_DIR),
      console: true,
    });
    bootLogger.fatal(`Configuración inválida, la API no puede arrancar. ${error.message}`);
    await closeLogger(bootLogger);
    process.exit(1);
  }
})();
