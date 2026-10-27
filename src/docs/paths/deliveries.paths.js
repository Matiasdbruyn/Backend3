import {
  DELIVERY_ASSIGNABLE_STATUSES,
  DELIVERY_STATUS,
  DELIVERY_STATUS_TRANSITIONS,
  ORDER_STATUS,
  USER_ROLES,
} from '../../constants/index.js';
import {
  DeliveryAlreadyExistsError,
  DeliveryNotFoundError,
  InvalidIdError,
  InvalidRoleError,
  InvalidStateError,
  InvalidStatusError,
  InvalidStatusTransitionError,
  OrderNotFoundError,
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

const ID = '6650a1b2c3d4e5f6a7b8c9d4';
const ORDER_ID = '6650a1b2c3d4e5f6a7b8c9d2';
const COURIER_ID = '6650a1b2c3d4e5f6a7b8c9d3';
const BASE = '/api/deliveries';
const ITEM = `${BASE}/${ID}`;

const invalidId = (method, path = `${BASE}/123`) =>
  errorExample(new InvalidIdError('123'), { path, method });
const deliveryNotFound = (method, path = ITEM) =>
  errorExample(new DeliveryNotFoundError({ id: ID }), { path, method });
const notCourier = (method, path) =>
  errorResponse('El usuario indicado no es repartidor', [
    errorExample(
      new InvalidRoleError(`El usuario indicado no es un repartidor (rol actual: "${USER_ROLES.USER}")`, {
        courierId: COURIER_ID,
        role: USER_ROLES.USER,
        requiredRole: USER_ROLES.COURIER,
      }),
      { path, method },
    ),
  ]);

const allStatuses = Object.values(DELIVERY_STATUS);

export const deliveriesPaths = {
  [BASE]: {
    get: {
      tags: ['Deliveries'],
      summary: 'Listar entregas',
      description: 'Entregas paginadas con datos del pedido y del repartidor (sin el historial de estados).',
      parameters: [
        queryEnum('status', allStatuses, 'Filtra por estado'),
        { name: 'courierId', in: 'query', description: 'Entregas de un repartidor', schema: { type: 'string' } },
        paramRef('Page'),
        paramRef('Limit'),
      ],
      responses: {
        200: successResponse('Listado de entregas', 'Delivery', { list: true }),
        400: errorResponse('Query params inválidos', [
          errorExample(
            new ValidationError([{ field: 'status', message: `status debe ser uno de: ${allStatuses.join(', ')}` }]),
            { path: `${BASE}?status=perdida` },
          ),
        ]),
        ...commonErrors,
      },
    },
    post: {
      tags: ['Deliveries'],
      summary: 'Crear la entrega de un pedido',
      description:
        'Solo para pedidos `confirmed` y sin entrega previa. Genera el código de seguimiento. Con `courierId` queda `assigned`; sin repartidor, `pending`.',
      requestBody: jsonBody('DeliveryCreate'),
      responses: {
        201: successResponse('Entrega creada', 'Delivery'),
        400: errorResponse('Datos inválidos', [
          errorExample(
            new ValidationError([
              { field: 'estimatedDeliveryDate', message: 'La fecha estimada de entrega debe ser futura' },
            ]),
            { path: BASE, method: 'POST' },
          ),
        ]),
        404: errorResponse('El pedido o el repartidor no existen', [
          errorExample(new OrderNotFoundError({ id: ORDER_ID }), { path: BASE, method: 'POST' }),
          errorExample(new UserNotFoundError({ id: COURIER_ID }), { path: BASE, method: 'POST' }),
        ]),
        409: errorResponse('El pedido no está confirmado o ya tiene entrega', [
          errorExample(
            new InvalidStateError(
              `Solo se pueden crear entregas para pedidos en estado "${ORDER_STATUS.CONFIRMED}" (estado actual: "${ORDER_STATUS.PENDING}")`,
              { orderId: ORDER_ID, status: ORDER_STATUS.PENDING },
            ),
            { path: BASE, method: 'POST' },
          ),
          errorExample(new DeliveryAlreadyExistsError(ORDER_ID, ID), { path: BASE, method: 'POST' }),
        ]),
        422: notCourier('POST', BASE),
        ...commonErrors,
      },
    },
  },
  [`${BASE}/tracking/{trackingCode}`]: {
    get: {
      tags: ['Deliveries'],
      summary: 'Seguimiento por código',
      description:
        'Vista pública del estado de una entrega. No distingue mayúsculas/minúsculas. Solo expone la ciudad de destino y el nombre y vehículo del repartidor.',
      parameters: [
        {
          name: 'trackingCode',
          in: 'path',
          required: true,
          description: 'Código de seguimiento',
          schema: { type: 'string', example: 'SN-7YFCX59YXV' },
        },
      ],
      responses: {
        200: successResponse('Estado de la entrega', 'DeliveryTracking'),
        404: errorResponse('No existe una entrega con ese código', [
          errorExample(new DeliveryNotFoundError({ trackingCode: 'SN-XXXXXXXXXX' }), {
            path: `${BASE}/tracking/SN-XXXXXXXXXX`,
          }),
        ]),
        ...commonErrors,
      },
    },
  },
  [`${BASE}/{id}`]: {
    get: {
      tags: ['Deliveries'],
      summary: 'Obtener una entrega',
      description: 'Incluye el historial completo de estados.',
      parameters: [idParam('de la entrega')],
      responses: {
        200: successResponse('Entrega encontrada', 'Delivery'),
        400: errorResponse('Id con formato inválido', [invalidId('GET')]),
        404: errorResponse('La entrega no existe', [deliveryNotFound('GET')]),
        ...commonErrors,
      },
    },
  },
  [`${BASE}/{id}/assign`]: {
    patch: {
      tags: ['Deliveries'],
      summary: 'Asignar o reasignar repartidor',
      description: `Permitido en estados: ${DELIVERY_ASSIGNABLE_STATUSES.join(', ')}. La entrega queda en \`${DELIVERY_STATUS.ASSIGNED}\`.`,
      parameters: [idParam('de la entrega')],
      requestBody: jsonBody('DeliveryAssign'),
      responses: {
        200: successResponse('Repartidor asignado', 'Delivery'),
        400: errorResponse('Id o datos inválidos', [
          invalidId('PATCH', `${BASE}/123/assign`),
          errorExample(new ValidationError([{ field: 'courierId', message: 'courierId es obligatorio' }]), {
            path: `${ITEM}/assign`,
            method: 'PATCH',
          }),
        ]),
        404: errorResponse('La entrega o el repartidor no existen', [
          deliveryNotFound('PATCH', `${ITEM}/assign`),
          errorExample(new UserNotFoundError({ id: COURIER_ID }), { path: `${ITEM}/assign`, method: 'PATCH' }),
        ]),
        409: errorResponse('La entrega ya salió o terminó', [
          errorExample(
            new InvalidStateError(
              `No se puede asignar un repartidor a una entrega en estado "${DELIVERY_STATUS.IN_TRANSIT}"`,
              { status: DELIVERY_STATUS.IN_TRANSIT, allowedStatuses: DELIVERY_ASSIGNABLE_STATUSES },
            ),
            { path: `${ITEM}/assign`, method: 'PATCH' },
          ),
        ]),
        422: notCourier('PATCH', `${ITEM}/assign`),
        ...commonErrors,
      },
    },
  },
  [`${BASE}/{id}/status`]: {
    patch: {
      tags: ['Deliveries'],
      summary: 'Cambiar el estado de una entrega',
      description: [
        'Transiciones: `pending → assigned | cancelled`, `assigned → in_transit | cancelled`, `in_transit → delivered | failed`, `failed → assigned | cancelled`.',
        '',
        'Sincroniza el pedido: `in_transit` → pedido `shipped`; `delivered` → pedido `delivered`; `cancelled` → pedido `cancelled` (y se devuelve el stock).',
      ].join('\n'),
      parameters: [idParam('de la entrega')],
      requestBody: jsonBody('DeliveryStatusUpdate'),
      responses: {
        200: successResponse('Estado actualizado', 'Delivery'),
        400: errorResponse('Id inválido, status faltante o estado inválido', [
          invalidId('PATCH', `${BASE}/123/status`),
          errorExample(new ValidationError([{ field: 'status', message: 'El estado (status) es obligatorio' }]), {
            path: `${ITEM}/status`,
            method: 'PATCH',
          }),
          errorExample(new InvalidStatusError('perdida', allStatuses), { path: `${ITEM}/status`, method: 'PATCH' }),
        ]),
        404: errorResponse('La entrega no existe', [deliveryNotFound('PATCH', `${ITEM}/status`)]),
        409: errorResponse('Transición no permitida o falta repartidor', [
          errorExample(
            new InvalidStatusTransitionError(
              DELIVERY_STATUS.DELIVERED,
              DELIVERY_STATUS.FAILED,
              DELIVERY_STATUS_TRANSITIONS[DELIVERY_STATUS.DELIVERED],
            ),
            { path: `${ITEM}/status`, method: 'PATCH' },
          ),
          errorExample(
            new InvalidStateError('La entrega no tiene repartidor: asignalo con PATCH /api/deliveries/:id/assign'),
            { path: `${ITEM}/status`, method: 'PATCH' },
          ),
        ]),
        ...commonErrors,
      },
    },
  },
};
