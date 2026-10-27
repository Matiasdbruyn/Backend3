/**
 * Setup global de Mocha (se carga antes que cualquier test, ver .mocharc.json).
 *
 * 1. Carga las variables de .env.test (entorno separado del de desarrollo).
 * 2. Si .env.test no define MONGODB_URI, levanta un MongoDB en memoria.
 * 3. Recién después importa la app: así la configuración se valida con las
 *    variables de testing y nunca toca la base de desarrollo.
 */
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config({ path: '.env.test', override: true, quiet: true });

let memoryServer;
if (!process.env.MONGODB_URI) {
  memoryServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memoryServer.getUri('shipnow_test');
}

const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
const { closeLogger } = await import('../src/config/logger.config.js');
const { logger } = await import('../src/utils/logger.js');
const { assertTestDatabase, clearDatabase } = await import('./helpers/database.js');

let isTestDatabase = false;

export const mochaHooks = {
  async beforeAll() {
    await connectDatabase();
    assertTestDatabase();
    isTestDatabase = true;
  },

  // Estrategia de limpieza: cada test arranca con la base vacía, así ningún
  // test depende de los datos ni del orden de otro.
  async beforeEach() {
    await clearDatabase();
  },

  // Se ejecuta siempre (aunque algo haya fallado) para no dejar el proceso colgado
  async afterAll() {
    try {
      if (isTestDatabase) await clearDatabase();
    } finally {
      await disconnectDatabase();
      await closeLogger(logger);
      await memoryServer?.stop();
    }
  },
};
