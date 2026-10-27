import app from './app.js';
import { config, connectDatabase, disconnectDatabase } from './config/index.js';
import { closeLogger } from './config/logger.config.js';
import { logger } from './utils/logger.js';

// Registra la falla como fatal, espera a que se escriba el log y termina el proceso.
const exitWithFatal = async (message, error) => {
  logger.fatal(`${message}: ${error?.message ?? error}`, { stack: error?.stack });
  await closeLogger(logger);
  process.exit(1);
};

process.on('uncaughtException', (error) => exitWithFatal('Excepción no controlada', error));
process.on('unhandledRejection', (reason) => exitWithFatal('Promesa rechazada sin manejar', reason));

const start = async () => {
  try {
    await connectDatabase();
  } catch (error) {
    await exitWithFatal('No se pudo conectar a MongoDB, la API no puede arrancar', error);
  }

  const server = app.listen(config.port, () => {
    logger.info(`Servidor ShipNow escuchando en el puerto ${config.port} (entorno: ${config.nodeEnv})`);
  });

  // Apagado prolijo: deja de aceptar conexiones, cierra la base y el logger
  const shutdown = (signal) => {
    logger.info(`${signal} recibido, cerrando el servidor...`);
    server.close(async () => {
      await disconnectDatabase();
      await closeLogger(logger);
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start();
