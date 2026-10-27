import mongoose from 'mongoose';

/**
 * Por seguridad, los tests solo trabajan sobre bases cuyo nombre contenga
 * "test": nunca se borran datos de desarrollo por un .env.test mal configurado.
 */
export const assertTestDatabase = () => {
  const { name } = mongoose.connection;
  if (!name.includes('test')) {
    throw new Error(
      `Por seguridad, los tests solo corren sobre bases de testing (base actual: "${name}"). ` +
        'Revisá MONGODB_URI en .env.test',
    );
  }
};

/** Vacía todas las colecciones de la base de testing (conserva los índices). */
export const clearDatabase = async () => {
  assertTestDatabase();
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

// Cantidad de documentos de una colección (para verificar efectos en la base)
export const countDocuments = (collectionName) =>
  mongoose.connection.db.collection(collectionName).countDocuments();
