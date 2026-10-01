import { fakerES as faker } from '@faker-js/faker';
import {
  DELIVERY_STATUS,
  MOCKS,
  ORDER_PRIORITY,
  ORDER_STATUS,
  PRODUCT_STATUS,
  USER_ROLES,
  VEHICLE_TYPES,
} from '../constants/index.js';
import {
  buildHistoryEntry,
  calculateEstimatedDeliveryDate,
  generateTrackingCode,
} from '../services/delivery.service.js';
import { buildOrderItem, calculateOrderTotals } from '../services/order.service.js';
import { resolveProductStatus } from '../services/product.service.js';

/**
 * Generadores de datos simulados. Son funciones puras (no tocan la base):
 * arman objetos con la misma forma que los modelos, usando las constantes
 * del proyecto y las mismas reglas de negocio que los services
 * (estado según stock, totales del pedido, código de seguimiento, etc.).
 *
 * Cada objeto lleva un _id con formato ObjectId para poder relacionarlos
 * entre sí antes de insertarlos (pedido → usuario, entrega → pedido…).
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const createMany = (qty, factory) => Array.from({ length: qty }, factory);

const slugify = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const createMockAddress = () => ({
  street: faker.location.streetAddress(),
  city: faker.location.city(),
  zipCode: faker.location.zipCode(),
});

// ─── Usuarios ────────────────────────────────────────────────────────────────

const ROLE_WEIGHTS = [
  { value: USER_ROLES.USER, weight: 7 },
  { value: USER_ROLES.COURIER, weight: 2 },
  { value: USER_ROLES.ADMIN, weight: 1 },
];

/** Usuario sin contraseña (se agrega hasheada solo al insertar). */
export const createMockUser = ({ role } = {}) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const finalRole = role ?? faker.helpers.weightedArrayElement(ROLE_WEIGHTS);
  const suffix = faker.string.alphanumeric({ length: 6, casing: 'lower' });

  const user = {
    _id: faker.database.mongodbObjectId(),
    firstName,
    lastName,
    email: `${slugify(firstName)}.${slugify(lastName)}.${suffix}@${MOCKS.EMAIL_DOMAIN}`,
    role: finalRole,
    phone: faker.phone.number(),
  };
  // Solo los repartidores tienen vehículo (misma regla que UserService)
  if (finalRole === USER_ROLES.COURIER) {
    user.vehicleType = faker.helpers.arrayElement(Object.values(VEHICLE_TYPES));
  }
  return user;
};

// ─── Productos ───────────────────────────────────────────────────────────────

export const createMockProduct = ({ forceStock = false } = {}) => {
  // ~15% de los productos sin stock, para tener ambos estados
  const hasStock = forceStock || faker.datatype.boolean({ probability: 0.85 });
  const stock = hasStock ? faker.number.int({ min: 1, max: 200 }) : 0;

  return {
    _id: faker.database.mongodbObjectId(),
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    code: `SKU-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`,
    price: faker.number.int({ min: 500, max: 150000 }),
    stock,
    category: faker.commerce.department(),
    status: resolveProductStatus(stock),
  };
};

const isAvailable = (product) => product.status === PRODUCT_STATUS.AVAILABLE && product.stock > 0;

// ─── Pedidos ─────────────────────────────────────────────────────────────────

const ORDER_STATUS_WEIGHTS = [
  { value: ORDER_STATUS.PENDING, weight: 3 },
  { value: ORDER_STATUS.CONFIRMED, weight: 3 },
  { value: ORDER_STATUS.SHIPPED, weight: 2 },
  { value: ORDER_STATUS.DELIVERED, weight: 3 },
  { value: ORDER_STATUS.CANCELLED, weight: 1 },
];

// Estados del pedido que implican una entrega creada
const ORDER_STATUSES_WITH_DELIVERY = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
];
// Estados que necesitan un repartidor (la entrega ya salió)
const ORDER_STATUSES_NEEDING_COURIER = [ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED];

const ORDER_NOTES = [
  'Tocar timbre',
  'Dejar en portería',
  'Llamar antes de llegar',
  'Paquete frágil',
  'Entregar por la tarde',
  'Departamento al fondo del pasillo',
];

const pickOrderStatus = ({ hasCouriers, onlyWithDelivery }) => {
  const options = ORDER_STATUS_WEIGHTS.filter(
    ({ value }) =>
      (hasCouriers || !ORDER_STATUSES_NEEDING_COURIER.includes(value)) &&
      (!onlyWithDelivery || ORDER_STATUSES_WITH_DELIVERY.includes(value)),
  );
  return faker.helpers.weightedArrayElement(options);
};

export const createMockOrder = ({ customer, products, status, createdAt }) => {
  const available = products.filter(isAvailable);
  const selected = faker.helpers.arrayElements(available, {
    min: 1,
    max: Math.min(MOCKS.MAX_ITEMS_PER_ORDER, available.length),
  });
  const items = selected.map((product) =>
    buildOrderItem(
      product,
      faker.number.int({ min: 1, max: Math.min(MOCKS.MAX_UNITS_PER_ITEM, product.stock) }),
    ),
  );
  const priority = faker.helpers.arrayElement(Object.values(ORDER_PRIORITY));

  return {
    _id: faker.database.mongodbObjectId(),
    user: customer._id,
    items,
    priority,
    status,
    shippingAddress: createMockAddress(),
    notes: faker.datatype.boolean({ probability: 0.3 }) ? faker.helpers.arrayElement(ORDER_NOTES) : '',
    ...calculateOrderTotals(items, priority),
    createdAt,
  };
};

// ─── Entregas ────────────────────────────────────────────────────────────────

// Estados por los que pasó una entrega hasta llegar al actual (para el historial)
const DELIVERY_STATUS_PATH = {
  [DELIVERY_STATUS.PENDING]: [DELIVERY_STATUS.PENDING],
  [DELIVERY_STATUS.ASSIGNED]: [DELIVERY_STATUS.PENDING, DELIVERY_STATUS.ASSIGNED],
  [DELIVERY_STATUS.IN_TRANSIT]: [
    DELIVERY_STATUS.PENDING,
    DELIVERY_STATUS.ASSIGNED,
    DELIVERY_STATUS.IN_TRANSIT,
  ],
  [DELIVERY_STATUS.FAILED]: [
    DELIVERY_STATUS.PENDING,
    DELIVERY_STATUS.ASSIGNED,
    DELIVERY_STATUS.IN_TRANSIT,
    DELIVERY_STATUS.FAILED,
  ],
  [DELIVERY_STATUS.DELIVERED]: [
    DELIVERY_STATUS.PENDING,
    DELIVERY_STATUS.ASSIGNED,
    DELIVERY_STATUS.IN_TRANSIT,
    DELIVERY_STATUS.DELIVERED,
  ],
};

const HISTORY_NOTES = {
  [DELIVERY_STATUS.PENDING]: 'Entrega creada',
  [DELIVERY_STATUS.ASSIGNED]: 'Repartidor asignado',
  [DELIVERY_STATUS.IN_TRANSIT]: 'El paquete está en camino',
  [DELIVERY_STATUS.FAILED]: 'No se encontró a nadie en el domicilio',
  [DELIVERY_STATUS.DELIVERED]: 'Entregado al destinatario',
};

// El estado de la entrega tiene que ser coherente con el del pedido.
const resolveDeliveryStatus = (orderStatus, hasCourier) => {
  if (orderStatus === ORDER_STATUS.DELIVERED) return DELIVERY_STATUS.DELIVERED;
  if (orderStatus === ORDER_STATUS.SHIPPED) {
    return faker.datatype.boolean({ probability: 0.8 })
      ? DELIVERY_STATUS.IN_TRANSIT
      : DELIVERY_STATUS.FAILED;
  }
  // Pedido confirmado: la entrega espera repartidor o ya lo tiene
  return hasCourier && faker.datatype.boolean() ? DELIVERY_STATUS.ASSIGNED : DELIVERY_STATUS.PENDING;
};

export const createMockDelivery = ({ order, courier }) => {
  const status = resolveDeliveryStatus(order.status, Boolean(courier));
  const start = new Date(order.createdAt.getTime() + HOUR_MS);

  let changedAt = start;
  const statusHistory = DELIVERY_STATUS_PATH[status].map((step, index) => {
    if (index > 0) changedAt = new Date(changedAt.getTime() + faker.number.int({ min: 1, max: 8 }) * HOUR_MS);
    return buildHistoryEntry(step, HISTORY_NOTES[step], changedAt);
  });

  return {
    _id: faker.database.mongodbObjectId(),
    order: order._id,
    courier: status === DELIVERY_STATUS.PENDING ? null : courier._id,
    trackingCode: generateTrackingCode(),
    status,
    address: order.shippingAddress,
    estimatedDeliveryDate: calculateEstimatedDeliveryDate(order.priority, start),
    deliveredAt: status === DELIVERY_STATUS.DELIVERED ? changedAt : null,
    statusHistory,
    createdAt: start,
  };
};

// ─── Sets de datos relacionados ──────────────────────────────────────────────

/**
 * Genera `qty` pedidos para clientes y productos dados y, cuando el estado
 * del pedido lo requiere, su entrega (con repartidor si corresponde).
 */
export const buildOrdersWithDeliveries = ({
  customers,
  products,
  couriers = [],
  qty,
  onlyWithDelivery = false,
}) => {
  const hasCouriers = couriers.length > 0;
  const orders = [];
  const deliveries = [];

  for (let i = 0; i < qty; i += 1) {
    const status = pickOrderStatus({ hasCouriers, onlyWithDelivery });
    const order = createMockOrder({
      customer: faker.helpers.arrayElement(customers),
      products,
      status,
      // Al menos 2 días atrás, para que el historial de la entrega no quede en el futuro
      createdAt: faker.date.recent({ days: 15, refDate: new Date(Date.now() - 2 * DAY_MS) }),
    });
    orders.push(order);

    if (ORDER_STATUSES_WITH_DELIVERY.includes(status)) {
      const courier = hasCouriers ? faker.helpers.arrayElement(couriers) : null;
      deliveries.push(createMockDelivery({ order, courier }));
    }
  }
  return { orders, deliveries };
};

/** Arma en memoria un set completo y coherente de datos relacionados. */
export const buildMockDataset = ({ users = 0, couriers = 0, products = 0, orders = 0 }) => {
  const customerList = createMany(users, () => createMockUser({ role: USER_ROLES.USER }));
  const courierList = createMany(couriers, () => createMockUser({ role: USER_ROLES.COURIER }));
  const productList = createMany(products, () => createMockProduct());

  // Para poder armar pedidos tiene que haber al menos un producto con stock
  if (orders > 0 && !productList.some(isAvailable)) {
    productList[0] = createMockProduct({ forceStock: true });
  }

  const related =
    orders > 0
      ? buildOrdersWithDeliveries({
          customers: customerList,
          products: productList,
          couriers: courierList,
          qty: orders,
        })
      : { orders: [], deliveries: [] };

  return { users: customerList, couriers: courierList, products: productList, ...related };
};
