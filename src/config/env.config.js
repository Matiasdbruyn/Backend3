import dotenv from 'dotenv';
import { NODE_ENVS } from '../constants/index.js';

// Único lugar del proyecto que lee process.env.
dotenv.config({ quiet: true });

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
        '  Copiá el archivo .env.example como .env y completá los valores.',
    );
  }

  const errors = [];
  const port = Number(env.PORT);
  const mongoUri = env.MONGODB_URI.trim();
  const nodeEnv = env.NODE_ENV.trim();
  const allowedEnvs = Object.values(NODE_ENVS);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`PORT debe ser un número entero entre 1 y 65535 (recibido: "${env.PORT}")`);
  }
  if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
    errors.push('MONGODB_URI debe comenzar con "mongodb://" o "mongodb+srv://"');
  }
  if (!allowedEnvs.includes(nodeEnv)) {
    errors.push(`NODE_ENV debe ser uno de: ${allowedEnvs.join(', ')} (recibido: "${nodeEnv}")`);
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
  });
};

// Fail fast: si la configuración es inválida la app no arranca.
export const config = (() => {
  try {
    return loadConfig(process.env);
  } catch (error) {
    console.error(`\n[config] ❌ ${error.message}\n`);
    process.exit(1);
  }
})();
