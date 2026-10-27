import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { config } from './env.config.js';

// Eventos de una conexión ya establecida (caídas y reconexiones). Se registran
// después de conectar: los errores de la conexión inicial los maneja server.js.
const watchConnection = () => {
  const { connection } = mongoose;
  connection.on('disconnected', () => logger.warning('Se perdió la conexión con MongoDB'));
  connection.on('reconnected', () => logger.info('Conexión con MongoDB restablecida'));
  connection.on('error', (error) => logger.error(`Error en la conexión con MongoDB: ${error.message}`));
};

export const connectDatabase = async () => {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  watchConnection();
  const { host, name } = mongoose.connection;
  logger.info(`Conexión a MongoDB establecida (${host}/${name})`);
};

export const disconnectDatabase = async () => {
  mongoose.connection.removeAllListeners();
  await mongoose.disconnect();
  logger.info('Conexión a MongoDB cerrada');
};
