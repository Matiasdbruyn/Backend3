import app from './app.js';
import { config, connectDatabase, disconnectDatabase } from './config/index.js';

const start = async () => {
  try {
    await connectDatabase();
  } catch (error) {
    console.error(`[db] ❌ No se pudo conectar a MongoDB: ${error.message}`);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.info(`[server] ShipNow API escuchando en http://localhost:${config.port} (${config.nodeEnv})`);
  });

  // Apagado prolijo: deja de aceptar conexiones y cierra la base
  const shutdown = (signal) => {
    console.info(`[server] ${signal} recibido, cerrando...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start();
