import {
  DELIVERY_STATUS,
  DELIVERY_STATUSES_BLOCKING_CANCELLATION,
  ORDER_STATUS,
  ORDER_STATUS_MANAGED_BY_DELIVERY,
  ORDER_STATUS_TRANSITIONS,
  PRODUCT_STATUS,
  SHIPPING_COST_BY_PRIORITY,
  USER_ROLES,
} from '../constants/index.js';
import {
  InsufficientStockError,
  InvalidRoleError,
  InvalidStateError,
  InvalidStatusError,
  InvalidStatusTransitionError,
  OrderNotFoundError,
  ProductNotFoundError,
  UserNotFoundError,
} from '../errors/index.js';
import { deliveryRepository } from '../repositories/delivery.repository.js';
import { orderRepository } from '../repositories/order.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { assertValidId } from '../utils/ids.js';
import { logger } from '../utils/logger.js';
import { buildPagination } from '../utils/pagination.js';
import { validate } from '../validators/common.validator.js';
import {
  createOrderSchema,
  orderQuerySchema,
  orderStatusSchema,
  updateOrderSchema,
} from '../validators/order.validator.js';
import { productService } from './product.service.js';

// ─── Reglas de negocio puras (las reutiliza también el módulo de mocks) ──────

const roundMoney = (amount) => Math.round(amount * 100) / 100;

// Cada ítem guarda título y precio del momento de la compra.
export const buildOrderItem = (product, quantity) => ({
  product: product._id,
  title: product.title,
  unitPrice: product.price,
  quantity,
  subtotal: roundMoney(product.price * quantity),
});

export const calculateOrderTotals = (items, priority) => {
  const subtotal = roundMoney(items.reduce((acc, item) => acc + item.subtotal, 0));
  const shippingCost = SHIPPING_COST_BY_PRIORITY[priority];
  return { subtotal, shippingCost, total: roundMoney(subtotal + shippingCost) };
};

// Si el mismo producto viene repetido en el body, se suman las cantidades.
const mergeDuplicateItems = (items) => {
  const merged = new Map();
  for (const { productId, quantity } of items) {
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
};

const toStockItems = (orderItems) =>
  orderItems.map(({ product, quantity }) => ({ productId: product, quantity }));

export class OrderService {
  constructor({ orderRepository, userRepository, productRepository, deliveryRepository, productService }) {
    this.orderRepository = orderRepository;
    this.userRepository = userRepository;
    this.productRepository = productRepository;
    this.deliveryRepository = deliveryRepository;
    this.productService = productService;
  }

  async getOrders(query) {
    const { page, limit, ...filters } = validate(orderQuerySchema, query);
    const { docs, total } = await this.orderRepository.findAll(filters, { page, limit });
    return { docs, pagination: buildPagination({ total, page, limit }) };
  }

  async getOrderById(id) {
    assertValidId(id);
    const order = await this.orderRepository.findById(id);
    if (!order) throw new OrderNotFoundError({ id });
    return order;
  }

  async createOrder(data) {
    const payload = validate(createOrderSchema, data);
    const items = mergeDuplicateItems(payload.items);

    await this.#ensureCustomer(payload.userId);
    const products = await this.#loadProducts(items);

    const orderItems = items.map(({ productId, quantity }) => {
      const product = products.get(productId);
      if (product.status !== PRODUCT_STATUS.AVAILABLE || product.stock < quantity) {
        throw new InsufficientStockError({
          productId,
          title: product.title,
          requested: quantity,
          available: product.stock,
        });
      }
      return buildOrderItem(product, quantity);
    });

    // Se descuenta el stock al crear el pedido; si falla el guardado se devuelve.
    await this.productService.reserveStock(items);
    let order;
    try {
      order = await this.orderRepository.create({
        user: payload.userId,
        items: orderItems,
        priority: payload.priority,
        status: ORDER_STATUS.PENDING,
        shippingAddress: payload.shippingAddress,
        notes: payload.notes,
        ...calculateOrderTotals(orderItems, payload.priority),
      });
    } catch (error) {
      await this.productService.releaseStock(items);
      logger.error(`Falló la creación del pedido del usuario ${payload.userId}: ${error.message}`);
      throw error;
    }

    logger.info(
      `Pedido ${order._id} creado para el usuario ${payload.userId}: ${orderItems.length} ítem(s), ` +
        `total $${order.total} (prioridad ${order.priority})`,
    );
    return order;
  }

  async updateOrder(id, data) {
    const order = await this.getOrderById(id);
    const changes = validate(updateOrderSchema, data);

    if (order.status !== ORDER_STATUS.PENDING) {
      throw new InvalidStateError(
        `Solo se pueden modificar pedidos en estado "${ORDER_STATUS.PENDING}" (estado actual: "${order.status}")`,
        { status: order.status },
      );
    }
    if (changes.priority && changes.priority !== order.priority) {
      Object.assign(changes, calculateOrderTotals(order.items, changes.priority));
    }
    const updated = await this.orderRepository.updateById(id, changes);
    logger.info(`Pedido ${id} actualizado (${Object.keys(changes).join(', ')})`);
    return updated;
  }

  async updateOrderStatus(id, data) {
    const order = await this.getOrderById(id);
    const { status } = validate(orderStatusSchema, data);

    const allStatuses = Object.values(ORDER_STATUS);
    if (!allStatuses.includes(status)) throw new InvalidStatusError(status, allStatuses);
    if (ORDER_STATUS_MANAGED_BY_DELIVERY.includes(status)) {
      throw new InvalidStatusError(
        status,
        allStatuses.filter((value) => !ORDER_STATUS_MANAGED_BY_DELIVERY.includes(value)),
        `El estado "${status}" se asigna automáticamente según el avance de la entrega`,
      );
    }

    if (status === ORDER_STATUS.CANCELLED) return this.#cancelOrder(order);
    return this.changeStatus(order, status);
  }

  async deleteOrder(id) {
    const order = await this.getOrderById(id);
    const deletable = [ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED];
    if (!deletable.includes(order.status)) {
      throw new InvalidStateError(
        `Solo se pueden eliminar pedidos en estado ${deletable.join(' o ')} (estado actual: "${order.status}")`,
        { status: order.status, allowedStatuses: deletable },
      );
    }

    await this.orderRepository.deleteById(id);
    // Un pedido pendiente todavía tenía stock reservado
    if (order.status === ORDER_STATUS.PENDING) {
      await this.productService.releaseStock(toStockItems(order.items));
    }
    await this.deliveryRepository.deleteByOrderId(id);
    logger.info(`Pedido ${id} eliminado (estado: ${order.status})`);
    return order;
  }

  /**
   * Aplica un cambio de estado validando la transición. Lo usa también el
   * service de entregas para mantener el pedido sincronizado.
   */
  async changeStatus(order, to) {
    const allowed = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(to)) throw new InvalidStatusTransitionError(order.status, to, allowed);

    const updated = await this.orderRepository.updateStatus(order._id, { from: order.status, to });
    if (!updated) {
      throw new InvalidStateError('El pedido fue modificado por otra operación, volvé a intentarlo');
    }
    if (to === ORDER_STATUS.CANCELLED) {
      await this.productService.releaseStock(toStockItems(order.items));
    }
    logger.info(`Pedido ${order._id}: estado "${order.status}" → "${to}"`);
    return updated;
  }

  async #cancelOrder(order) {
    const delivery = await this.deliveryRepository.findByOrderId(order._id);
    if (delivery && DELIVERY_STATUSES_BLOCKING_CANCELLATION.includes(delivery.status)) {
      throw new InvalidStateError(
        `No se puede cancelar el pedido: su entrega está en estado "${delivery.status}"`,
        { deliveryId: delivery._id, deliveryStatus: delivery.status },
      );
    }

    const cancelled = await this.changeStatus(order, ORDER_STATUS.CANCELLED);
    if (delivery && delivery.status !== DELIVERY_STATUS.CANCELLED) {
      await this.deliveryRepository.updateById(
        delivery._id,
        { status: DELIVERY_STATUS.CANCELLED },
        { status: DELIVERY_STATUS.CANCELLED, note: 'Pedido cancelado', changedAt: new Date() },
      );
      logger.info(`Entrega ${delivery.trackingCode} cancelada junto con el pedido ${order._id}`);
    }
    return cancelled;
  }

  // Regla de negocio: solo los clientes (role user) generan pedidos.
  async #ensureCustomer(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundError({ id: userId });
    if (user.role !== USER_ROLES.USER) {
      throw new InvalidRoleError(
        `Solo los usuarios con rol "${USER_ROLES.USER}" (clientes) pueden generar pedidos`,
        { userId, role: user.role, requiredRole: USER_ROLES.USER },
      );
    }
    return user;
  }

  async #loadProducts(items) {
    const products = await this.productRepository.findByIds(items.map((item) => item.productId));
    const byId = new Map(products.map((product) => [String(product._id), product]));
    const missing = items.find(({ productId }) => !byId.has(productId));
    if (missing) throw new ProductNotFoundError({ id: missing.productId });
    return byId;
  }
}

export const orderService = new OrderService({
  orderRepository,
  userRepository,
  productRepository,
  deliveryRepository,
  productService,
});
