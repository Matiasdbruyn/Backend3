import { PRODUCT_STATUS } from '../../constants/index.js';
import {
  InvalidIdError,
  InvalidJsonError,
  ProductCodeAlreadyExistsError,
  ProductNotFoundError,
  ValidationError,
} from '../../errors/index.js';
import { idParam, paramRef, queryEnum } from '../components/parameters.js';
import {
  commonErrors,
  errorExample,
  errorResponse,
  jsonBody,
  successResponse,
} from '../components/responses.js';

const ID = '6650a1b2c3d4e5f6a7b8c9d1';
const BASE = '/api/products';

const invalidId = (method) => errorExample(new InvalidIdError('123'), { path: `${BASE}/123`, method });
const notFound = (method) =>
  errorResponse('El producto no existe', [
    errorExample(new ProductNotFoundError({ id: ID }), { path: `${BASE}/${ID}`, method }),
  ]);
const codeTaken = (method, path) =>
  errorResponse('Ya existe un producto con ese código', [
    errorExample(new ProductCodeAlreadyExistsError('BOX-M'), { path, method }),
  ]);

export const productsPaths = {
  [BASE]: {
    get: {
      tags: ['Products'],
      summary: 'Listar productos (catálogo)',
      description:
        'Por defecto devuelve **solo productos con stock**. Para ver todos usar `includeOutOfStock=true` o filtrar por `status`.',
      parameters: [
        queryEnum('status', Object.values(PRODUCT_STATUS), 'Filtra por estado'),
        { name: 'category', in: 'query', description: 'Categoría (sin distinguir mayúsculas)', schema: { type: 'string' } },
        { name: 'minPrice', in: 'query', schema: { type: 'number', minimum: 0 } },
        { name: 'maxPrice', in: 'query', schema: { type: 'number', minimum: 0 } },
        {
          name: 'includeOutOfStock',
          in: 'query',
          description: 'Incluir productos sin stock',
          schema: { type: 'string', enum: ['true', 'false'] },
        },
        paramRef('Page'),
        paramRef('Limit'),
      ],
      responses: {
        200: successResponse('Listado de productos', 'Product', { list: true }),
        400: errorResponse('Query params inválidos', [
          errorExample(
            new ValidationError([{ field: 'minPrice', message: 'minPrice no puede ser negativo' }]),
            { path: `${BASE}?minPrice=-3` },
          ),
        ]),
        ...commonErrors,
      },
    },
    post: {
      tags: ['Products'],
      summary: 'Crear producto',
      description: 'El `status` no se envía: la API lo calcula a partir del stock.',
      requestBody: jsonBody('ProductCreate'),
      responses: {
        201: successResponse('Producto creado', 'Product'),
        400: errorResponse('Datos inválidos', [
          errorExample(
            new ValidationError([
              { field: 'price', message: 'El precio no puede ser negativo' },
              { field: 'status', message: 'Campo no permitido' },
            ]),
            { path: BASE, method: 'POST' },
          ),
          errorExample(new InvalidJsonError(), { path: BASE, method: 'POST' }),
        ]),
        409: codeTaken('POST', BASE),
        ...commonErrors,
      },
    },
  },
  [`${BASE}/{id}`]: {
    get: {
      tags: ['Products'],
      summary: 'Obtener un producto',
      parameters: [idParam('del producto')],
      responses: {
        200: successResponse('Producto encontrado', 'Product'),
        400: errorResponse('Id con formato inválido', [invalidId('GET')]),
        404: notFound('GET'),
        ...commonErrors,
      },
    },
    put: {
      tags: ['Products'],
      summary: 'Actualizar un producto',
      description: 'Si cambia el stock, se recalcula el estado.',
      parameters: [idParam('del producto')],
      requestBody: jsonBody('ProductUpdate'),
      responses: {
        200: successResponse('Producto actualizado', 'Product'),
        400: errorResponse('Id o datos inválidos', [
          invalidId('PUT'),
          errorExample(
            new ValidationError([{ field: 'stock', message: 'El stock debe ser un número entero' }]),
            { path: `${BASE}/${ID}`, method: 'PUT' },
          ),
        ]),
        404: notFound('PUT'),
        409: codeTaken('PUT', `${BASE}/${ID}`),
        ...commonErrors,
      },
    },
    delete: {
      tags: ['Products'],
      summary: 'Eliminar un producto',
      parameters: [idParam('del producto')],
      responses: {
        200: successResponse('Producto eliminado (devuelve el producto borrado)', 'Product'),
        400: errorResponse('Id con formato inválido', [invalidId('DELETE')]),
        404: notFound('DELETE'),
        ...commonErrors,
      },
    },
  },
};
