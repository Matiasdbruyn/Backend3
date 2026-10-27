import request from 'supertest';
import app from '../../src/app.js';
import { ORDER_STATUS, USER_ROLES } from '../../src/constants/index.js';
import { createMockProduct, createMockUser } from '../../src/mocks/generators.js';

/**
 * Datos de prueba controlados y descartables. Se crean a través de la API
 * (igual que lo haría un cliente) usando los generadores de mocks como base.
 * La base se vacía antes de cada test (ver tests/setup.js).
 */

export const api = () => request(app);

export const TEST_PASSWORD = 'secreto123';
export const NON_EXISTENT_ID = '665f1f77bcf86cd799439011';

export const validAddress = () => ({ street: 'Av. Siempreviva 742', city: 'Springfield', zipCode: '1234' });

// Body válido para POST /api/users (sin _id, que lo genera MongoDB)
export const buildUserBody = (role = USER_ROLES.USER, overrides = {}) => {
  const { _id, ...mock } = createMockUser({ role });
  return { ...mock, password: TEST_PASSWORD, ...overrides };
};

export const createUser = async (role = USER_ROLES.USER, overrides = {}) => {
  const res = await api().post('/api/users').send(buildUserBody(role, overrides));
  if (res.status !== 201) throw new Error(`No se pudo crear el usuario: ${JSON.stringify(res.body)}`);
  return res.body.payload;
};

export const createCustomer = (overrides) => createUser(USER_ROLES.USER, overrides);
export const createCourier = (overrides) => createUser(USER_ROLES.COURIER, overrides);

// Body válido para POST /api/products (el status lo calcula la API)
export const buildProductBody = (overrides = {}) => {
  const { _id, status, ...mock } = createMockProduct({ forceStock: true });
  return { ...mock, ...overrides };
};

export const createProduct = async (overrides = {}) => {
  const res = await api().post('/api/products').send(buildProductBody(overrides));
  if (res.status !== 201) throw new Error(`No se pudo crear el producto: ${JSON.stringify(res.body)}`);
  return res.body.payload;
};

export const createOrder = async ({ userId, items, priority, shippingAddress = validAddress() }) => {
  const res = await api().post('/api/orders').send({ userId, items, priority, shippingAddress });
  if (res.status !== 201) throw new Error(`No se pudo crear el pedido: ${JSON.stringify(res.body)}`);
  return res.body.payload;
};

/** Cliente + producto + pedido (opcionalmente ya confirmado). */
export const createOrderScenario = async ({ confirmed = false, stock = 10, quantity = 2, price = 1000 } = {}) => {
  const customer = await createCustomer();
  const product = await createProduct({ stock, price });
  let order = await createOrder({ userId: customer._id, items: [{ productId: product._id, quantity }] });

  if (confirmed) {
    const res = await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CONFIRMED });
    order = res.body.payload;
  }
  return { customer, product, order };
};
