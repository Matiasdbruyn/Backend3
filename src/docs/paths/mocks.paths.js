import { MOCK_COLLECTIONS, MOCKS, USER_ROLES } from '../../constants/index.js';
import {
  InvalidJsonError,
  InvalidMockCollectionError,
  InvalidMockQuantityError,
  MockDependencyError,
  MockSeedError,
  ValidationError,
} from '../../errors/index.js';
import { paramRef, queryEnum } from '../components/parameters.js';
import {
  commonErrors,
  errorExample,
  errorResponse,
  jsonBody,
  responseRef,
  successResponse,
} from '../components/responses.js';

const BASE = '/api/mocks';
const MAX = MOCKS.MAX_QTY;

// Mismos mensajes que arma parseMockQuantity
const qtyError = (path, reason, received, { field = 'qty', min = 1, method = 'GET', key } = {}) =>
  errorExample(new InvalidMockQuantityError(`"${field}" ${reason}`, { field, received, min, max: MAX }), {
    path,
    method,
    key,
  });

const invalidQtyResponse = (path, method = 'GET') =>
  errorResponse('Cantidad inválida (negativa, cero, decimal, no numérica o mayor al máximo)', [
    qtyError(`${path}?qty=-5`, 'no puede ser negativo', '-5', { method, key: 'negativa' }),
    qtyError(`${path}?qty=abc`, 'debe ser un número entero (recibido: "abc")', 'abc', { method, key: 'no_numerica' }),
    qtyError(`${path}?qty=0`, 'debe ser como mínimo 1', '0', { method, key: 'cero' }),
    qtyError(`${path}?qty=500`, `no puede superar ${MAX}`, '500', { method, key: 'mayor_al_maximo' }),
  ]);

// Endpoints que solo generan datos en memoria (no consultan la base)
const inMemoryGet = (entity, schema, description) => ({
  get: {
    tags: ['Mocks'],
    summary: `Generar ${entity} simulados (no se guardan)`,
    description,
    parameters: [paramRef('Qty')],
    responses: {
      200: successResponse(`Lista de ${entity} simulados`, schema, { list: true, paginated: false }),
      400: invalidQtyResponse(`${BASE}/${entity}`),
      500: responseRef('InternalError'),
    },
  },
});

const datasetCount = (name) => ({
  name,
  in: 'query',
  description: `Cantidad de ${name} (0 a ${MAX})`,
  schema: { type: 'integer', minimum: 0, maximum: MAX, default: MOCKS.DATASET_DEFAULTS[name] },
});

const seedFailed = (path, failedCollection) =>
  errorResponse('Falló la inserción en MongoDB: se revierte lo insertado', [
    errorExample(new MockSeedError(undefined, { failedCollection, rolledBack: true }), { path, method: 'POST' }),
  ]);

export const mocksPaths = {
  [`${BASE}/users`]: {
    get: {
      tags: ['Mocks'],
      summary: 'Generar usuarios simulados (no se guardan)',
      description:
        'Usuarios con roles válidos. Sin `role` mezcla clientes, repartidores (con vehículo) y admins.',
      parameters: [paramRef('Qty'), queryEnum('role', Object.values(USER_ROLES), 'Rol de todos los usuarios generados')],
      responses: {
        200: successResponse('Lista de usuarios simulados', 'MockUser', { list: true, paginated: false }),
        400: errorResponse('Cantidad o rol inválidos', [
          qtyError(`${BASE}/users?qty=-5`, 'no puede ser negativo', '-5', { key: 'cantidad_negativa' }),
          qtyError(`${BASE}/users?qty=2.5`, 'debe ser un número entero, sin decimales', '2.5', { key: 'cantidad_decimal' }),
          errorExample(
            new ValidationError([{ field: 'role', message: 'role debe ser uno de: admin, user, courier' }]),
            { path: `${BASE}/users?role=superadmin`, key: 'rol_invalido' },
          ),
        ]),
        500: responseRef('InternalError'),
      },
    },
  },
  [`${BASE}/couriers`]: inMemoryGet('couriers', 'MockUser', 'Repartidores: rol `courier` con tipo de vehículo.'),
  [`${BASE}/products`]: inMemoryGet('products', 'MockProduct', 'Productos con estado calculado según stock (~15% sin stock).'),
  [`${BASE}/orders`]: inMemoryGet(
    'orders',
    'MockOrder',
    'Pedidos con estados y prioridades válidos. Cada pedido referencia un cliente y productos simulados, con totales calculados con la misma regla que la API.',
  ),
  [`${BASE}/deliveries`]: inMemoryGet(
    'deliveries',
    'MockDelivery',
    'Entregas con estado coherente con su pedido e historial de estados. Las `pending` no tienen repartidor.',
  ),
  [`${BASE}/dataset`]: {
    get: {
      tags: ['Mocks'],
      summary: 'Generar un set relacionado (no se guarda)',
      description:
        'Clientes, repartidores, productos, pedidos y entregas en el que los `_id` coinciden entre entidades. Para pedir pedidos hace falta al menos 1 usuario y 1 producto.',
      parameters: ['users', 'couriers', 'products', 'orders'].map(datasetCount),
      responses: {
        200: successResponse('Set de datos relacionado', 'MockDataset'),
        400: errorResponse('Cantidades inválidas o parámetro desconocido', [
          qtyError(`${BASE}/dataset?products=-1`, 'no puede ser negativo', '-1', { field: 'products', min: 0 }),
          errorExample(
            new InvalidMockQuantityError('Para generar pedidos hacen falta al menos 1 usuario (cliente) y 1 producto', {
              received: { users: 0, couriers: 3, products: 15, orders: 3 },
            }),
            { path: `${BASE}/dataset?users=0&orders=3`, key: 'pedidos_sin_usuarios' },
          ),
          errorExample(
            new ValidationError([
              { field: 'usuarios', message: 'Campo no reconocido. Campos permitidos: users, couriers, products, orders' },
            ]),
            { path: `${BASE}/dataset?usuarios=3` },
          ),
        ]),
        500: responseRef('InternalError'),
      },
    },
  },
  [`${BASE}/seed`]: {
    post: {
      tags: ['Mocks'],
      summary: 'Insertar datos de prueba en una colección',
      description: [
        `Inserta \`qty\` registros en MongoDB. Colecciones: ${Object.values(MOCK_COLLECTIONS).join(', ')} (por defecto \`users\`).`,
        `Los usuarios se guardan con la contraseña \`${MOCKS.DEFAULT_PASSWORD}\` hasheada.`,
        '',
        'Para `orders` usa clientes, productos con stock y repartidores **que ya existen en la base**, y crea también sus entregas.',
      ].join('\n'),
      parameters: [
        queryEnum('collection', Object.values(MOCK_COLLECTIONS), 'Colección a poblar (por defecto users)'),
        paramRef('Qty'),
      ],
      responses: {
        201: successResponse('Registros insertados', 'MockSeedResult'),
        400: errorResponse('Cantidad o colección inválidas', [
          qtyError(`${BASE}/seed?qty=-10`, 'no puede ser negativo', '-10', { method: 'POST' }),
          errorExample(new InvalidMockCollectionError('pets', Object.values(MOCK_COLLECTIONS)), {
            path: `${BASE}/seed?collection=pets`,
            method: 'POST',
          }),
        ]),
        409: errorResponse('Faltan clientes o productos en la base para generar pedidos', [
          errorExample(
            new MockDependencyError(
              'Para generar pedidos primero tiene que haber clientes (role user) y productos con stock en la base',
              {
                customersFound: 0,
                availableProductsFound: 0,
                hint: 'Usá POST /api/mocks/seed?collection=users y POST /api/mocks/seed?collection=products',
              },
            ),
            { path: `${BASE}/seed?collection=orders`, method: 'POST' },
          ),
        ]),
        500: seedFailed(`${BASE}/seed`, 'users'),
        503: commonErrors[503],
      },
    },
  },
  [`${BASE}/generateData`]: {
    post: {
      tags: ['Mocks'],
      summary: 'Insertar un set completo de datos de prueba',
      description:
        'Genera e inserta clientes, repartidores, productos, pedidos y entregas relacionados. El body es opcional: si no se envía se usan las cantidades por defecto.',
      requestBody: jsonBody('MockGenerateDataInput', { required: false }),
      responses: {
        201: successResponse('Datos insertados', 'MockGenerateDataResult'),
        400: errorResponse('Cantidades inválidas o body inválido', [
          qtyError(`${BASE}/generateData`, 'no puede ser negativo', -2, { field: 'users', min: 0, method: 'POST' }),
          qtyError(`${BASE}/generateData`, `no puede superar ${MAX}`, 1000, {
            field: 'orders',
            min: 0,
            method: 'POST',
            key: 'mayor_al_maximo',
          }),
          errorExample(
            new ValidationError([
              { field: 'usuarios', message: 'Campo no reconocido. Campos permitidos: users, couriers, products, orders' },
            ]),
            { path: `${BASE}/generateData`, method: 'POST' },
          ),
          errorExample(new InvalidJsonError(), { path: `${BASE}/generateData`, method: 'POST' }),
        ]),
        500: seedFailed(`${BASE}/generateData`, 'orders'),
        503: commonErrors[503],
      },
    },
  },
};
