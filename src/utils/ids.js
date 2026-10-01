import { InvalidIdError } from '../errors/index.js';

// Validamos el formato de ObjectId sin importar Mongoose: los services no
// deben conocer la librería de acceso a datos.
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export const isValidObjectId = (value) => typeof value === 'string' && OBJECT_ID_REGEX.test(value);

export const assertValidId = (id, field = 'id') => {
  if (!isValidObjectId(id)) throw new InvalidIdError(id, field);
};
