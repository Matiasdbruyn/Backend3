import mongoose from 'mongoose';
import { config } from './env.config.js';

export const connectDatabase = async () => {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  const { host, name } = mongoose.connection;
  console.info(`[db] Conectado a MongoDB (${host}/${name})`);
};

export const disconnectDatabase = async () => {
  await mongoose.disconnect();
  console.info('[db] Conexión a MongoDB cerrada');
};
