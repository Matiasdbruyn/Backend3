import { expect } from 'chai';
import {
  ORDER_PRIORITY,
  ORDER_STATUS,
  PRODUCT_STATUS,
  SHIPPING_COST_BY_PRIORITY,
} from '../src/constants/index.js';
import {
  expectError,
  expectPaginated,
  expectSuccess,
  expectValidationError,
} from './helpers/assertions.js';
import {
  api,
  createCourier,
  createCustomer,
  createOrderScenario,
  createProduct,
  NON_EXISTENT_ID,
  validAddress,
} from './helpers/fixtures.js';

const getProduct = async (id) => (await api().get(`/api/products/${id}`)).body.payload;
const changeStatus = (orderId, status) => api().patch(`/api/orders/${orderId}/status`).send({ status });

describe('Pedidos — /api/orders', () => {
  describe('POST /api/orders', () => {
    let customer;
    let product;

    beforeEach(async () => {
      customer = await createCustomer();
      product = await createProduct({ price: 1500, stock: 5 });
    });

    it('crea el pedido pendiente, calcula totales y descuenta el stock', async () => {
      const res = await api()
        .post('/api/orders')
        .send({
          userId: customer._id,
          items: [{ productId: product._id, quantity: 2 }],
          priority: ORDER_PRIORITY.URGENT,
          shippingAddress: validAddress(),
          notes: 'Tocar timbre',
        });

      const order = expectSuccess(res, 201);
      expect(res.body.message).to.equal('Pedido creado');
      expect(order).to.include({
        status: ORDER_STATUS.PENDING,
        priority: ORDER_PRIORITY.URGENT,
        subtotal: 3000,
        shippingCost: SHIPPING_COST_BY_PRIORITY[ORDER_PRIORITY.URGENT],
        total: 3000 + SHIPPING_COST_BY_PRIORITY[ORDER_PRIORITY.URGENT],
      });
      expect(order.user).to.include({ _id: customer._id, email: customer.email });
      expect(order.items).to.deep.equal([
        { product: product._id, title: product.title, unitPrice: 1500, quantity: 2, subtotal: 3000 },
      ]);
      expect(order.shippingAddress).to.deep.equal(validAddress());

      expect((await getProduct(product._id)).stock).to.equal(3);
    });

    it('usa prioridad normal por defecto y deja el producto sin stock si se agota', async () => {
      const res = await api()
        .post('/api/orders')
        .send({ userId: customer._id, items: [{ productId: product._id, quantity: 5 }], shippingAddress: validAddress() });

      expect(expectSuccess(res, 201).priority).to.equal(ORDER_PRIORITY.NORMAL);
      expect(await getProduct(product._id)).to.include({ stock: 0, status: PRODUCT_STATUS.OUT_OF_STOCK });
    });

    it('responde 400 VALIDATION_ERROR con datos incompletos', async () => {
      const res = await api().post('/api/orders').send({ userId: customer._id, items: [] });
      expectValidationError(res, ['items', 'shippingAddress']);
    });

    it('responde 400 INVALID_JSON si el body no es JSON válido', async () => {
      const res = await api().post('/api/orders').set('Content-Type', 'application/json').send('{"userId": ');
      expectError(res, 400, 'INVALID_JSON');
    });

    it('responde 404 si el usuario o el producto no existen', async () => {
      const noUser = await api()
        .post('/api/orders')
        .send({ userId: NON_EXISTENT_ID, items: [{ productId: product._id, quantity: 1 }], shippingAddress: validAddress() });
      expectError(noUser, 404, 'USER_NOT_FOUND');

      const noProduct = await api()
        .post('/api/orders')
        .send({ userId: customer._id, items: [{ productId: NON_EXISTENT_ID, quantity: 1 }], shippingAddress: validAddress() });
      expectError(noProduct, 404, 'PRODUCT_NOT_FOUND');
    });

    it('responde 409 INSUFFICIENT_STOCK y no descuenta stock', async () => {
      const res = await api()
        .post('/api/orders')
        .send({ userId: customer._id, items: [{ productId: product._id, quantity: 6 }], shippingAddress: validAddress() });

      const error = expectError(res, 409, 'INSUFFICIENT_STOCK');
      expect(error.details).to.include({ productId: product._id, requested: 6, available: 5 });
      expect((await getProduct(product._id)).stock).to.equal(5);
    });

    it('responde 422 INVALID_ROLE si quien pide no es cliente', async () => {
      const courier = await createCourier();
      const res = await api()
        .post('/api/orders')
        .send({ userId: courier._id, items: [{ productId: product._id, quantity: 1 }], shippingAddress: validAddress() });
      expect(expectError(res, 422, 'INVALID_ROLE').details).to.include({ role: 'courier', requiredRole: 'user' });
    });
  });

  describe('GET /api/orders', () => {
    it('lista los pedidos y permite filtrar por estado', async () => {
      const { order } = await createOrderScenario();
      await createOrderScenario({ confirmed: true });

      const all = expectPaginated(await api().get('/api/orders'));
      expect(all.pagination.total).to.equal(2);

      const pending = expectPaginated(await api().get('/api/orders').query({ status: ORDER_STATUS.PENDING }));
      expect(pending.payload.map((o) => o._id)).to.deep.equal([order._id]);
    });

    it('responde 400 con filtros inválidos', async () => {
      const res = await api().get('/api/orders').query({ userId: 'abc', priority: 'mega' });
      expectValidationError(res, ['userId', 'priority']);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('devuelve el pedido con los datos del cliente', async () => {
      const { order, customer } = await createOrderScenario();
      const found = expectSuccess(await api().get(`/api/orders/${order._id}`), 200);
      expect(found).to.include({ _id: order._id, total: order.total });
      expect(found.user._id).to.equal(customer._id);
    });

    it('responde 404 ORDER_NOT_FOUND si no existe', async () => {
      const error = expectError(await api().get(`/api/orders/${NON_EXISTENT_ID}`), 404, 'ORDER_NOT_FOUND');
      expect(error.details).to.deep.equal({ id: NON_EXISTENT_ID });
    });

    it('responde 400 INVALID_ID con un id mal formado', async () => {
      expectError(await api().get('/api/orders/no-es-un-id'), 400, 'INVALID_ID');
    });
  });

  describe('PUT /api/orders/:id', () => {
    it('al cambiar la prioridad recalcula el costo de envío y el total', async () => {
      const { order } = await createOrderScenario();
      const res = await api().put(`/api/orders/${order._id}`).send({ priority: ORDER_PRIORITY.LOW });
      const updated = expectSuccess(res, 200);
      expect(updated.shippingCost).to.equal(SHIPPING_COST_BY_PRIORITY[ORDER_PRIORITY.LOW]);
      expect(updated.total).to.equal(updated.subtotal + updated.shippingCost);
    });

    it('responde 409 INVALID_STATE si el pedido ya no está pendiente', async () => {
      const { order } = await createOrderScenario({ confirmed: true });
      expectError(await api().put(`/api/orders/${order._id}`).send({ notes: 'x' }), 409, 'INVALID_STATE');
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('confirma un pedido pendiente', async () => {
      const { order } = await createOrderScenario();
      const res = await changeStatus(order._id, ORDER_STATUS.CONFIRMED);
      expect(expectSuccess(res, 200).status).to.equal(ORDER_STATUS.CONFIRMED);
      expect(res.body.message).to.equal(`Estado del pedido actualizado a "${ORDER_STATUS.CONFIRMED}"`);
    });

    it('al cancelar devuelve el stock reservado', async () => {
      const { order, product } = await createOrderScenario({ stock: 4, quantity: 4 });
      expect((await getProduct(product._id)).status).to.equal(PRODUCT_STATUS.OUT_OF_STOCK);

      expect(expectSuccess(await changeStatus(order._id, ORDER_STATUS.CANCELLED), 200).status).to.equal(
        ORDER_STATUS.CANCELLED,
      );
      expect(await getProduct(product._id)).to.include({ stock: 4, status: PRODUCT_STATUS.AVAILABLE });
    });

    it('responde 400 INVALID_STATUS con un estado inexistente', async () => {
      const { order } = await createOrderScenario();
      const error = expectError(await changeStatus(order._id, 'volando'), 400, 'INVALID_STATUS');
      expect(error.details).to.deep.include({ received: 'volando' });
    });

    it('responde 400 INVALID_STATUS si se intenta asignar un estado que maneja la entrega', async () => {
      const { order } = await createOrderScenario({ confirmed: true });
      const error = expectError(await changeStatus(order._id, ORDER_STATUS.SHIPPED), 400, 'INVALID_STATUS');
      expect(error.message).to.match(/automáticamente/);
    });

    it('responde 409 INVALID_STATUS_TRANSITION con una transición no permitida', async () => {
      const { order } = await createOrderScenario({ confirmed: true });
      const error = expectError(await changeStatus(order._id, ORDER_STATUS.PENDING), 409, 'INVALID_STATUS_TRANSITION');
      expect(error.details).to.deep.include({ from: ORDER_STATUS.CONFIRMED, to: ORDER_STATUS.PENDING });
    });

    it('responde 400 VALIDATION_ERROR si falta el estado y 404 si el pedido no existe', async () => {
      const { order } = await createOrderScenario();
      expectValidationError(await api().patch(`/api/orders/${order._id}/status`).send({}), ['status']);
      expectError(await changeStatus(NON_EXISTENT_ID, ORDER_STATUS.CONFIRMED), 404, 'ORDER_NOT_FOUND');
    });
  });

  describe('DELETE /api/orders/:id', () => {
    it('elimina un pedido pendiente y devuelve el stock', async () => {
      const { order, product } = await createOrderScenario({ stock: 10, quantity: 3 });
      expectSuccess(await api().delete(`/api/orders/${order._id}`), 200);
      expect((await getProduct(product._id)).stock).to.equal(10);
      expectError(await api().get(`/api/orders/${order._id}`), 404, 'ORDER_NOT_FOUND');
    });

    it('responde 409 INVALID_STATE si el pedido está confirmado', async () => {
      const { order } = await createOrderScenario({ confirmed: true });
      expectError(await api().delete(`/api/orders/${order._id}`), 409, 'INVALID_STATE');
    });
  });
});
