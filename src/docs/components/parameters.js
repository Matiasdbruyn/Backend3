import { MOCKS, PAGINATION } from '../../constants/index.js';

export const parameters = {
  Page: {
    name: 'page',
    in: 'query',
    description: 'Número de página',
    schema: { type: 'integer', minimum: 1, default: PAGINATION.DEFAULT_PAGE },
  },
  Limit: {
    name: 'limit',
    in: 'query',
    description: `Resultados por página (máximo ${PAGINATION.MAX_LIMIT})`,
    schema: { type: 'integer', minimum: 1, maximum: PAGINATION.MAX_LIMIT, default: PAGINATION.DEFAULT_LIMIT },
  },
  Qty: {
    name: 'qty',
    in: 'query',
    description: `Cantidad de registros: entero entre 1 y ${MOCKS.MAX_QTY}`,
    schema: { type: 'integer', minimum: 1, maximum: MOCKS.MAX_QTY, default: MOCKS.DEFAULT_QTY },
  },
};

export const paramRef = (name) => ({ $ref: `#/components/parameters/${name}` });

// Parámetro de ruta :id (ObjectId de MongoDB)
export const idParam = (entity) => ({
  name: 'id',
  in: 'path',
  required: true,
  description: `Id ${entity} (ObjectId de 24 caracteres hexadecimales)`,
  schema: { type: 'string', example: '6650a1b2c3d4e5f6a7b8c9d0' },
});

export const queryEnum = (name, values, description) => ({
  name,
  in: 'query',
  description,
  schema: { type: 'string', enum: values },
});
