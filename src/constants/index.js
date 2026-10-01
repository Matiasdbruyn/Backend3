/**
 * Diccionario de constantes del dominio de ShipNow.
 * Todos los objetos están congelados (Object.freeze) para que nadie pueda
 * modificarlos en tiempo de ejecución. Ningún archivo del proyecto debería
 * escribir estos valores "a mano": siempre se referencian desde acá.
 */

export const NODE_ENVS = Object.freeze({
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
});

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  USER: 'user', // cliente que genera pedidos
  COURIER: 'courier', // repartidor
});

export const VEHICLE_TYPES = Object.freeze({
  BICYCLE: 'bicycle',
  MOTORCYCLE: 'motorcycle',
  CAR: 'car',
  VAN: 'van',
});

export const BCRYPT_SALT_ROUNDS = 10;

// ─── Productos ───────────────────────────────────────────────────────────────

export const PRODUCT_STATUS = Object.freeze({
  AVAILABLE: 'available',
  OUT_OF_STOCK: 'out_of_stock',
});

// ─── Pedidos ─────────────────────────────────────────────────────────────────

export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

// Transiciones permitidas: estado actual → estados a los que puede pasar.
export const ORDER_STATUS_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: Object.freeze([ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.CONFIRMED]: Object.freeze([ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.SHIPPED]: Object.freeze([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED]),
  [ORDER_STATUS.DELIVERED]: Object.freeze([]),
  [ORDER_STATUS.CANCELLED]: Object.freeze([]),
});

// Estados del pedido que NO se cambian a mano: los define el avance de la entrega.
export const ORDER_STATUS_MANAGED_BY_DELIVERY = Object.freeze([
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
]);

export const ORDER_PRIORITY = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
});

// Costo de envío (ARS) según la prioridad del pedido.
export const SHIPPING_COST_BY_PRIORITY = Object.freeze({
  [ORDER_PRIORITY.LOW]: 1500,
  [ORDER_PRIORITY.NORMAL]: 2500,
  [ORDER_PRIORITY.HIGH]: 4500,
  [ORDER_PRIORITY.URGENT]: 7000,
});

// ─── Entregas ────────────────────────────────────────────────────────────────

export const DELIVERY_STATUS = Object.freeze({
  PENDING: 'pending', // creada, sin repartidor
  ASSIGNED: 'assigned', // con repartidor asignado
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

export const DELIVERY_STATUS_TRANSITIONS = Object.freeze({
  [DELIVERY_STATUS.PENDING]: Object.freeze([DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.CANCELLED]),
  [DELIVERY_STATUS.ASSIGNED]: Object.freeze([DELIVERY_STATUS.IN_TRANSIT, DELIVERY_STATUS.CANCELLED]),
  [DELIVERY_STATUS.IN_TRANSIT]: Object.freeze([DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.FAILED]),
  [DELIVERY_STATUS.FAILED]: Object.freeze([DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.CANCELLED]),
  [DELIVERY_STATUS.DELIVERED]: Object.freeze([]),
  [DELIVERY_STATUS.CANCELLED]: Object.freeze([]),
});

// Cuando la entrega llega a estos estados, el pedido se actualiza automáticamente.
export const ORDER_STATUS_BY_DELIVERY_STATUS = Object.freeze({
  [DELIVERY_STATUS.IN_TRANSIT]: ORDER_STATUS.SHIPPED,
  [DELIVERY_STATUS.DELIVERED]: ORDER_STATUS.DELIVERED,
  [DELIVERY_STATUS.CANCELLED]: ORDER_STATUS.CANCELLED,
});

// Estados en los que la entrega ya salió y el pedido no se puede cancelar.
export const DELIVERY_STATUSES_BLOCKING_CANCELLATION = Object.freeze([
  DELIVERY_STATUS.IN_TRANSIT,
  DELIVERY_STATUS.DELIVERED,
]);

// Estados en los que todavía se puede asignar (o reasignar) un repartidor.
export const DELIVERY_ASSIGNABLE_STATUSES = Object.freeze([
  DELIVERY_STATUS.PENDING,
  DELIVERY_STATUS.ASSIGNED,
  DELIVERY_STATUS.FAILED,
]);

// Horas estimadas de entrega según la prioridad del pedido.
export const DELIVERY_HOURS_BY_PRIORITY = Object.freeze({
  [ORDER_PRIORITY.LOW]: 96,
  [ORDER_PRIORITY.NORMAL]: 72,
  [ORDER_PRIORITY.HIGH]: 48,
  [ORDER_PRIORITY.URGENT]: 24,
});

export const TRACKING_CODE = Object.freeze({
  PREFIX: 'SN',
  LENGTH: 10, // caracteres después del prefijo
});

// ─── Paginación ──────────────────────────────────────────────────────────────

export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
});

// ─── Mocks ───────────────────────────────────────────────────────────────────

export const MOCKS = Object.freeze({
  DEFAULT_QTY: 10,
  MAX_QTY: 100,
  DEFAULT_PASSWORD: 'coder123', // se guarda hasheada al insertar en MongoDB
  EMAIL_DOMAIN: 'shipnow.test',
  MAX_ITEMS_PER_ORDER: 3,
  MAX_UNITS_PER_ITEM: 3,
  // Cantidades por defecto de GET /api/mocks/dataset y POST /api/mocks/generateData
  DATASET_DEFAULTS: Object.freeze({ users: 10, couriers: 3, products: 15, orders: 20 }),
});

// Colecciones que se pueden poblar con POST /api/mocks/seed
export const MOCK_COLLECTIONS = Object.freeze({
  USERS: 'users',
  COURIERS: 'couriers',
  PRODUCTS: 'products',
  ORDERS: 'orders',
});

// ─── HTTP ────────────────────────────────────────────────────────────────────

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

export const RESPONSE_STATUS = Object.freeze({
  SUCCESS: 'success',
  ERROR: 'error',
});

export const REQUEST_BODY_LIMIT = '100kb';
