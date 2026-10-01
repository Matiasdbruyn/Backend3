import { randomInt } from 'node:crypto';
import {
  DELIVERY_ASSIGNABLE_STATUSES,
  DELIVERY_HOURS_BY_PRIORITY,
  DELIVERY_STATUS,
  DELIVERY_STATUS_TRANSITIONS,
  ORDER_STATUS,
  ORDER_STATUS_BY_DELIVERY_STATUS,
  TRACKING_CODE,
  USER_ROLES,
} from '../constants/index.js';
import {
  DeliveryAlreadyExistsError,
  DeliveryNotFoundError,
  InvalidRoleError,
  InvalidStateError,
  InvalidStatusError,
  InvalidStatusTransitionError,
  UserNotFoundError,
  ValidationError,
} from '../errors/index.js';
import { deliveryRepository } from '../repositories/delivery.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { assertValidId } from '../utils/ids.js';
import { buildPagination } from '../utils/pagination.js';
import { validate } from '../validators/common.validator.js';
import {
  assignCourierSchema,
  createDeliverySchema,
  deliveryQuerySchema,
  deliveryStatusSchema,
} from '../validators/delivery.validator.js';
import { orderService } from './order.service.js';

// ─── Reglas de negocio puras (las reutiliza también el módulo de mocks) ──────

// Sin caracteres ambiguos (0/O, 1/I) para que el código sea fácil de dictar.
const TRACKING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const HOUR_MS = 60 * 60 * 1000;

export const generateTrackingCode = () => {
  let code = '';
  for (let i = 0; i < TRACKING_CODE.LENGTH; i += 1) {
    code += TRACKING_ALPHABET[randomInt(TRACKING_ALPHABET.length)];
  }
  return `${TRACKING_CODE.PREFIX}-${code}`;
};

export const calculateEstimatedDeliveryDate = (priority, from = new Date()) =>
  new Date(from.getTime() + DELIVERY_HOURS_BY_PRIORITY[priority] * HOUR_MS);

export const buildHistoryEntry = (status, note = '', changedAt = new Date()) => ({
  status,
  note,
  changedAt,
});

export class DeliveryService {
  constructor({ deliveryRepository, userRepository, orderService }) {
    this.deliveryRepository = deliveryRepository;
    this.userRepository = userRepository;
    this.orderService = orderService;
  }

  async getDeliveries(query) {
    const { page, limit, ...filters } = validate(deliveryQuerySchema, query);
    const { docs, total } = await this.deliveryRepository.findAll(filters, { page, limit });
    return { docs, pagination: buildPagination({ total, page, limit }) };
  }

  async getDeliveryById(id) {
    assertValidId(id);
    const delivery = await this.deliveryRepository.findById(id);
    if (!delivery) throw new DeliveryNotFoundError({ id });
    return delivery;
  }

  async getDeliveryByTrackingCode(code) {
    const trackingCode = String(code).trim().toUpperCase();
    const delivery = await this.deliveryRepository.findByTrackingCode(trackingCode);
    if (!delivery) throw new DeliveryNotFoundError({ trackingCode });
    return delivery;
  }

  async createDelivery(data) {
    const { orderId, courierId, estimatedDeliveryDate } = validate(createDeliverySchema, data);
    const order = await this.orderService.getOrderById(orderId);

    if (order.status !== ORDER_STATUS.CONFIRMED) {
      throw new InvalidStateError(
        `Solo se pueden crear entregas para pedidos en estado "${ORDER_STATUS.CONFIRMED}" (estado actual: "${order.status}")`,
        { orderId, status: order.status },
      );
    }
    const existing = await this.deliveryRepository.findByOrderId(orderId);
    if (existing) throw new DeliveryAlreadyExistsError(orderId, existing._id);
    if (courierId) await this.#getCourier(courierId);

    const now = new Date();
    if (estimatedDeliveryDate && estimatedDeliveryDate <= now) {
      throw new ValidationError([
        { field: 'estimatedDeliveryDate', message: 'La fecha estimada de entrega debe ser futura' },
      ]);
    }

    const statusHistory = [buildHistoryEntry(DELIVERY_STATUS.PENDING, 'Entrega creada', now)];
    if (courierId) {
      statusHistory.push(buildHistoryEntry(DELIVERY_STATUS.ASSIGNED, 'Repartidor asignado', now));
    }

    return this.deliveryRepository.create({
      order: orderId,
      courier: courierId ?? null,
      trackingCode: generateTrackingCode(),
      status: courierId ? DELIVERY_STATUS.ASSIGNED : DELIVERY_STATUS.PENDING,
      address: order.shippingAddress,
      estimatedDeliveryDate: estimatedDeliveryDate ?? calculateEstimatedDeliveryDate(order.priority, now),
      statusHistory,
    });
  }

  async assignCourier(id, data) {
    const delivery = await this.getDeliveryById(id);
    const { courierId } = validate(assignCourierSchema, data);

    if (!DELIVERY_ASSIGNABLE_STATUSES.includes(delivery.status)) {
      throw new InvalidStateError(
        `No se puede asignar un repartidor a una entrega en estado "${delivery.status}"`,
        { status: delivery.status, allowedStatuses: DELIVERY_ASSIGNABLE_STATUSES },
      );
    }
    const courier = await this.#getCourier(courierId);
    const verb = delivery.courier ? 'reasignado' : 'asignado';

    return this.deliveryRepository.updateById(
      id,
      { courier: courierId, status: DELIVERY_STATUS.ASSIGNED },
      buildHistoryEntry(
        DELIVERY_STATUS.ASSIGNED,
        `Repartidor ${verb}: ${courier.firstName} ${courier.lastName}`,
      ),
    );
  }

  async updateDeliveryStatus(id, data) {
    const delivery = await this.getDeliveryById(id);
    const { status, note } = validate(deliveryStatusSchema, data);

    const allStatuses = Object.values(DELIVERY_STATUS);
    if (!allStatuses.includes(status)) throw new InvalidStatusError(status, allStatuses);

    const allowed = DELIVERY_STATUS_TRANSITIONS[delivery.status];
    if (!allowed.includes(status)) {
      throw new InvalidStatusTransitionError(delivery.status, status, allowed);
    }
    if (status === DELIVERY_STATUS.ASSIGNED && !delivery.courier) {
      throw new InvalidStateError(
        'La entrega no tiene repartidor: asignalo con PATCH /api/deliveries/:id/assign',
      );
    }

    // Primero se sincroniza el pedido (si la transición no es válida, no se toca la entrega)
    const orderTarget = ORDER_STATUS_BY_DELIVERY_STATUS[status];
    if (orderTarget) {
      const order = await this.orderService.getOrderById(String(delivery.order._id));
      if (order.status !== orderTarget) await this.orderService.changeStatus(order, orderTarget);
    }

    const changes = { status };
    if (status === DELIVERY_STATUS.DELIVERED) changes.deliveredAt = new Date();
    return this.deliveryRepository.updateById(id, changes, buildHistoryEntry(status, note));
  }

  // Regla de negocio: solo un usuario con rol courier puede repartir.
  async #getCourier(courierId) {
    const courier = await this.userRepository.findById(courierId);
    if (!courier) throw new UserNotFoundError({ id: courierId });
    if (courier.role !== USER_ROLES.COURIER) {
      throw new InvalidRoleError(
        `El usuario indicado no es un repartidor (rol actual: "${courier.role}")`,
        { courierId, role: courier.role, requiredRole: USER_ROLES.COURIER },
      );
    }
    return courier;
  }
}

export const deliveryService = new DeliveryService({ deliveryRepository, userRepository, orderService });
