import { expect } from 'chai';
import {
  DELIVERY_STATUS,
  MOCK_COLLECTIONS,
  MOCKS,
  ORDER_PRIORITY,
  ORDER_STATUS,
  PRODUCT_STATUS,
  USER_ROLES,
  VEHICLE_TYPES,
} from '../src/constants/index.js';
import { expectError, expectPaginated, expectSuccess, expectValidationError } from './helpers/assertions.js';
import { countDocuments } from './helpers/database.js';
import { api } from './helpers/fixtures.js';

const expectInvalidQuantity = (res, field = 'qty') => {
  const error = expectError(res, 400, 'INVALID_MOCK_QUANTITY');
  expect(error.details).to.include({ field, max: MOCKS.MAX_QTY });
  return error;
};

describe('Mocks — /api/mocks', () => {
  describe('Datos simulados sin guardar (GET)', () => {
    it('GET /users?qty=2 devuelve 2 usuarios con roles válidos y no escribe en la base', async () => {
      const users = expectSuccess(await api().get('/api/mocks/users').query({ qty: 2 }), 200);

      expect(users).to.be.an('array').with.lengthOf(2);
      users.forEach((user) => {
        expect(user).to.include.all.keys('_id', 'firstName', 'lastName', 'email', 'role', 'phone');
        expect(Object.values(USER_ROLES)).to.include(user.role);
        expect(user).to.not.have.property('password');
      });
      expect(await countDocuments('users')).to.equal(0);
    });

    it('sin qty genera la cantidad por defecto', async () => {
      const users = expectSuccess(await api().get('/api/mocks/users'), 200);
      expect(users).to.have.lengthOf(MOCKS.DEFAULT_QTY);
    });

    it('GET /couriers y GET /users?role=courier generan repartidores con vehículo', async () => {
      const couriers = expectSuccess(await api().get('/api/mocks/couriers').query({ qty: 5 }), 200);
      const byRole = expectSuccess(await api().get('/api/mocks/users').query({ qty: 5, role: USER_ROLES.COURIER }), 200);

      [...couriers, ...byRole].forEach((user) => {
        expect(user.role).to.equal(USER_ROLES.COURIER);
        expect(Object.values(VEHICLE_TYPES)).to.include(user.vehicleType);
      });
    });

    it('GET /products genera productos con el estado coherente con el stock', async () => {
      const products = expectSuccess(await api().get('/api/mocks/products').query({ qty: 30 }), 200);
      products.forEach((product) => {
        const expected = product.stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK;
        expect(product.status).to.equal(expected);
      });
    });

    it('GET /orders genera pedidos con estados, prioridades y totales válidos', async () => {
      const orders = expectSuccess(await api().get('/api/mocks/orders').query({ qty: 20 }), 200);
      expect(orders).to.have.lengthOf(20);
      orders.forEach((order) => {
        expect(Object.values(ORDER_STATUS)).to.include(order.status);
        expect(Object.values(ORDER_PRIORITY)).to.include(order.priority);
        expect(order.user).to.match(/^[a-f\d]{24}$/);
        expect(order.items).to.be.an('array').that.is.not.empty;
        const itemsTotal = order.items.reduce((acc, item) => acc + item.subtotal, 0);
        expect(order.subtotal).to.equal(itemsTotal);
        expect(order.total).to.equal(order.subtotal + order.shippingCost);
      });
    });

    it('GET /deliveries genera entregas: solo las pendientes no tienen repartidor', async () => {
      const deliveries = expectSuccess(await api().get('/api/mocks/deliveries').query({ qty: 30 }), 200);
      deliveries.forEach((delivery) => {
        expect(Object.values(DELIVERY_STATUS)).to.include(delivery.status);
        expect(delivery.courier === null).to.equal(delivery.status === DELIVERY_STATUS.PENDING);
        expect(delivery.statusHistory.at(-1).status).to.equal(delivery.status);
      });
    });

    it('GET /dataset genera un set con las relaciones respetadas', async () => {
      const res = await api().get('/api/mocks/dataset').query({ users: 3, couriers: 2, products: 5, orders: 10 });
      const { users, couriers, products, orders, deliveries } = expectSuccess(res, 200);

      const ids = (list) => new Set(list.map((item) => item._id));
      const [userIds, courierIds, productIds, orderIds] = [ids(users), ids(couriers), ids(products), ids(orders)];

      expect(users.every((u) => u.role === USER_ROLES.USER)).to.equal(true);
      expect(orders).to.have.lengthOf(10);
      orders.forEach((order) => {
        expect(userIds.has(order.user)).to.equal(true);
        order.items.forEach((item) => expect(productIds.has(item.product)).to.equal(true));
      });
      deliveries.forEach((delivery) => {
        expect(orderIds.has(delivery.order)).to.equal(true);
        if (delivery.courier) expect(courierIds.has(delivery.courier)).to.equal(true);
      });
    });
  });

  describe('Validación de cantidades', () => {
    const invalidCases = [
      ['-5', /negativo/],
      ['0', /mínimo 1/],
      ['abc', /número entero/],
      ['2.5', /sin decimales/],
      [String(MOCKS.MAX_QTY + 1), /no puede superar/],
    ];

    invalidCases.forEach(([qty, message]) => {
      it(`qty=${qty} responde 400 INVALID_MOCK_QUANTITY`, async () => {
        const error = expectInvalidQuantity(await api().get('/api/mocks/products').query({ qty }));
        expect(error.message).to.match(message);
        expect(error.details.received).to.equal(qty);
      });
    });

    it('un rol inexistente responde 400 VALIDATION_ERROR', async () => {
      expectValidationError(await api().get('/api/mocks/users').query({ role: 'superadmin' }), ['role']);
    });

    it('pedir pedidos sin usuarios en el dataset responde 400', async () => {
      const res = await api().get('/api/mocks/dataset').query({ users: 0, orders: 3 });
      expect(expectError(res, 400, 'INVALID_MOCK_QUANTITY').message).to.match(/al menos 1 usuario/);
    });
  });

  describe('POST /api/mocks/seed', () => {
    it('inserta 10 usuarios de prueba por defecto en "users"', async () => {
      const res = await api().post('/api/mocks/seed').query({ qty: 10 });
      expect(expectSuccess(res, 201)).to.deep.equal({ inserted: 10, collection: MOCK_COLLECTIONS.USERS });

      const { pagination } = expectPaginated(await api().get('/api/users'));
      expect(pagination.total).to.equal(10);
    });

    it('genera pedidos sobre clientes y productos existentes, con sus entregas', async () => {
      await api().post('/api/mocks/seed').query({ collection: MOCK_COLLECTIONS.USERS, qty: 5 });
      await api().post('/api/mocks/seed').query({ collection: MOCK_COLLECTIONS.COURIERS, qty: 2 });
      await api().post('/api/mocks/seed').query({ collection: MOCK_COLLECTIONS.PRODUCTS, qty: 10 });

      // El seed de users mezcla roles: se asegura al menos un cliente
      await api().post('/api/users').send({
        firstName: 'Cliente',
        lastName: 'Test',
        email: 'cliente.seed@test.com',
        password: 'secreto123',
      });

      const result = expectSuccess(await api().post('/api/mocks/seed').query({ collection: 'orders', qty: 8 }), 201);
      expect(result).to.include({ inserted: 8, collection: MOCK_COLLECTIONS.ORDERS });
      expect(result.relatedDeliveries).to.equal(await countDocuments('deliveries'));
      expect(await countDocuments('orders')).to.equal(8);
    });

    it('responde 409 MOCK_DEPENDENCY_MISSING si no hay clientes ni productos', async () => {
      const res = await api().post('/api/mocks/seed').query({ collection: MOCK_COLLECTIONS.ORDERS, qty: 3 });
      const error = expectError(res, 409, 'MOCK_DEPENDENCY_MISSING');
      expect(error.details).to.include({ customersFound: 0, availableProductsFound: 0 });
    });

    it('responde 400 con una colección no soportada o una cantidad inválida', async () => {
      expectError(await api().post('/api/mocks/seed').query({ collection: 'pets' }), 400, 'INVALID_MOCK_COLLECTION');
      expectInvalidQuantity(await api().post('/api/mocks/seed').query({ qty: -10 }));
      expect(await countDocuments('users')).to.equal(0);
    });
  });

  describe('POST /api/mocks/generateData', () => {
    it('inserta un set completo con las cantidades pedidas', async () => {
      const res = await api().post('/api/mocks/generateData').send({ users: 4, couriers: 2, products: 6, orders: 9 });
      const { inserted, defaultPassword } = expectSuccess(res, 201);

      expect(inserted).to.include({ users: 4, couriers: 2, products: 6, orders: 9 });
      expect(defaultPassword).to.equal(MOCKS.DEFAULT_PASSWORD);
      expect(await countDocuments('users')).to.equal(6);
      expect(await countDocuments('deliveries')).to.equal(inserted.deliveries);

      // Lo insertado se puede consultar con la API real
      const { payload } = expectPaginated(await api().get('/api/orders').query({ limit: 100 }));
      expect(payload).to.have.lengthOf(9);
      payload.forEach((order) => expect(order.user).to.have.property('email'));
    });

    it('sin body usa las cantidades por defecto', async () => {
      const { inserted } = expectSuccess(await api().post('/api/mocks/generateData'), 201);
      expect(inserted).to.include(MOCKS.DATASET_DEFAULTS);
    });

    it('responde 400 con cantidades negativas o mayores al máximo y no inserta nada', async () => {
      expectInvalidQuantity(await api().post('/api/mocks/generateData').send({ users: -2 }), 'users');
      expectInvalidQuantity(await api().post('/api/mocks/generateData').send({ orders: 1000 }), 'orders');
      expect(await countDocuments('users')).to.equal(0);
    });

    it('responde 400 con un campo desconocido en el body', async () => {
      expectValidationError(await api().post('/api/mocks/generateData').send({ usuarios: 3 }), ['usuarios']);
    });
  });
});
