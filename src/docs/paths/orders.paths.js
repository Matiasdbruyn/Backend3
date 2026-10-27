import {
  DELIVERY_STATUS,
  ORDER_PRIORITY,
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  USER_ROLES,
} from '../../constants/index.js';
import {
  InsufficientStockError,
  InvalidIdError,
  InvalidJsonError,
  InvalidRoleError,
  InvalidStateError,
  InvalidStatusError,
  InvalidStatusTransitionError,
  OrderNotFoundError,
  ProductNotFoundError,
  UserNotFoundError,
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

const ID = '6650a1b2c3d4e5f6a7b8c9d2';
const USER_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const PRODUCT_ID = '6650a1b2c3d4e5f6a7b8c9d1';
const BASE = '/api/orders';
const ITEM = `${BASE}/${ID}`;

const invalidId = (method, path = `${BASE}/123`) =>
  errorExample(new InvalidIdError('123'), { path, method });
const notFound = (method, path = ITEM) =>
  errorResponse('El pedido no existe', [errorExample(new OrderNotFoundError({ id: ID }), { path, method })]);

const allStatuses = Object.values(ORDER_STATUS);

export const ordersPaths = {
  [BASE]: {
    get: {
      tags: ['Orders'],
      summary: 'Listar pedidos',
      description: 'Pedidos paginados, con los datos básicos del cliente.',
      parameters: [
        queryEnum('status', allStatuses, 'Filtra por estado'),
        queryEnum('priority', Object.values(ORDER_PRIORITY), 'Filtra por prioridad'),
        { name: 'userId', in: 'query', description: 'Pedidos de un cliente', schema: { type: 'string' } },
        paramRef('Page'),
        paramRef('Limit'),
      ],
      responses: {
        200: successResponse('Listado de pedidos', 'Order', { list: true }),
        400: errorResponse('Query params inválidos', [
          errorExample(new ValidationError([{ field: 'userId', message: 'userId no es un identificador válido' }]), {
            path: `${BASE}?userId=abc`,
          }),
        ]),
        ...commonErrors,
      },
    },
    post: {
      tags: ['Orders'],
      summary: 'Crear pedido',
      description:
        'Crea un pedido en estado `pending` para un cliente (rol `user`). Valida stock, **descuenta el stock** de cada producto y calcula subtotal, costo de envío (según prioridad) y total.',
      requestBody: jsonBody('OrderCreate'),
      responses: {
        201: successResponse('Pedido creado', 'Order'),
        400: errorResponse('Datos incompletos o inválidos', [
          errorExample(
            new ValidationError([
              { field: 'items', message: 'El pedido debe tener al menos un ítem' },
              { field: 'shippingAddress.city', message: 'El campo "ciudad" es obligatorio' },
            ]),
            { path: BASE, method: 'POST' },
          ),
          errorExample(new InvalidJsonError(), { path: BASE, method: 'POST' }),
        ]),
        404: errorResponse('El usuario o alguno de los productos no existe', [
          errorExample(new UserNotFoundError({ id: USER_ID }), { path: BASE, method: 'POST' }),
          errorExample(new ProductNotFoundError({ id: PRODUCT_ID }), { path: BASE, method: 'POST' }),
        ]),
        409: errorResponse('No hay stock suficiente', [
          errorExample(
            new InsufficientStockError({ productId: PRODUCT_ID, title: 'Caja mediana', requested: 3, available: 2 }),
            { path: BASE, method: 'POST' },
          ),
        ]),
        422: errorResponse('El usuario no es un cliente', [
          errorExample(
            new InvalidRoleError(`Solo los usuarios con rol "${USER_ROLES.USER}" (clientes) pueden generar pedidos`, {
              userId: USER_ID,
              role: USER_ROLES.COURIER,
              requiredRole: USER_ROLES.USER,
            }),
            { path: BASE, method: 'POST' },
          ),
        ]),
        ...commonErrors,
      },
    },
  },
  [`${BASE}/{id}`]: {
    get: {
      tags: ['Orders'],
      summary: 'Obtener un pedido por id',
      parameters: [idParam('del pedido')],
      responses: {
        200: successResponse('Pedido encontrado', 'Order'),
        400: errorResponse('Id con formato inválido', [invalidId('GET')]),
        404: notFound('GET'),
        ...commonErrors,
      },
    },
    put: {
      tags: ['Orders'],
      summary: 'Modificar un pedido pendiente',
      description:
        'Permite cambiar prioridad (recalcula costo de envío y total), dirección o notas. Solo para pedidos `pending`.',
      parameters: [idParam('del pedido')],
      requestBody: jsonBody('OrderUpdate'),
      responses: {
        200: successResponse('Pedido actualizado', 'Order'),
        400: errorResponse('Id o datos inválidos', [
          invalidId('PUT'),
          errorExample(
            new ValidationError([{ field: 'priority', message: 'La prioridad debe ser uno de: low, normal, high, urgent' }]),
            { path: ITEM, method: 'PUT' },
          ),
        ]),
        404: notFound('PUT'),
        409: errorResponse('El pedido ya no está pendiente', [
          errorExample(
            new InvalidStateError(
              `Solo se pueden modificar pedidos en estado "${ORDER_STATUS.PENDING}" (estado actual: "${ORDER_STATUS.CONFIRMED}")`,
              { status: ORDER_STATUS.CONFIRMED },
            ),
            { path: ITEM, method: 'PUT' },
          ),
        ]),
        ...commonErrors,
      },
    },
    delete: {
      tags: ['Orders'],
      summary: 'Eliminar un pedido',
      description:
        'Solo pedidos `pending` (se devuelve el stock) o `cancelled`. También elimina su entrega cancelada, si la tiene.',
      parameters: [idParam('del pedido')],
      responses: {
        200: successResponse('Pedido eliminado (devuelve el pedido borrado)', 'Order'),
        400: errorResponse('Id con formato inválido', [invalidId('DELETE')]),
        404: notFound('DELETE'),
        409: errorResponse('El pedido no se puede eliminar en su estado actual', [
          errorExample(
            new InvalidStateError(
              `Solo se pueden eliminar pedidos en estado ${ORDER_STATUS.PENDING} o ${ORDER_STATUS.CANCELLED} (estado actual: "${ORDER_STATUS.CONFIRMED}")`,
              { status: ORDER_STATUS.CONFIRMED, allowedStatuses: [ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED] },
            ),
            { path: ITEM, method: 'DELETE' },
          ),
        ]),
        ...commonErrors,
      },
    },
  },
  [`${BASE}/{id}/status`]: {
    patch: {
      tags: ['Orders'],
      summary: 'Cambiar el estado de un pedido',
      description: [
        'Estados que se asignan a mano: `confirmed` y `cancelled`.',
        '`shipped` y `delivered` se actualizan solos según el avance de la entrega.',
        '',
        'Transiciones: `pending → confirmed | cancelled`, `confirmed → shipped | cancelled`, `shipped → delivered | cancelled`.',
        'Al cancelar se devuelve el stock y se cancela la entrega si todavía no salió.',
      ].join('\n'),
      parameters: [idParam('del pedido')],
      requestBody: jsonBody('OrderStatusUpdate'),
      responses: {
        200: successResponse('Estado actualizado', 'Order'),
        400: errorResponse('Id inválido, status faltante o estado inválido', [
          invalidId('PATCH', `${BASE}/123/status`),
          errorExample(new ValidationError([{ field: 'status', message: 'El estado (status) es obligatorio' }]), {
            path: `${ITEM}/status`,
            method: 'PATCH',
            key: 'VALIDATION_ERROR',
          }),
          errorExample(new InvalidStatusError('volando', allStatuses), {
            path: `${ITEM}/status`,
            method: 'PATCH',
            key: 'INVALID_STATUS',
          }),
          errorExample(
            new InvalidStatusError(
              ORDER_STATUS.SHIPPED,
              [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
              `El estado "${ORDER_STATUS.SHIPPED}" se asigna automáticamente según el avance de la entrega`,
            ),
            { path: `${ITEM}/status`, method: 'PATCH', key: 'INVALID_STATUS_MANAGED_BY_DELIVERY' },
          ),
        ]),
        404: notFound('PATCH', `${ITEM}/status`),
        409: errorResponse('Transición no permitida o la entrega ya salió', [
          errorExample(
            new InvalidStatusTransitionError(
              ORDER_STATUS.CONFIRMED,
              ORDER_STATUS.PENDING,
              ORDER_STATUS_TRANSITIONS[ORDER_STATUS.CONFIRMED],
            ),
            { path: `${ITEM}/status`, method: 'PATCH' },
          ),
          errorExample(
            new InvalidStateError(
              `No se puede cancelar el pedido: su entrega está en estado "${DELIVERY_STATUS.IN_TRANSIT}"`,
              { deliveryId: '6650a1b2c3d4e5f6a7b8c9d4', deliveryStatus: DELIVERY_STATUS.IN_TRANSIT },
            ),
            { path: `${ITEM}/status`, method: 'PATCH' },
          ),
        ]),
        ...commonErrors,
      },
    },
  },
};
