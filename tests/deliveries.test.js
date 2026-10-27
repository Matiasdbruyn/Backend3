import { expect } from 'chai';
import { DELIVERY_STATUS, ORDER_STATUS, TRACKING_CODE } from '../src/constants/index.js';
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
  NON_EXISTENT_ID,
} from './helpers/fixtures.js';

const getOrder = async (id) => (await api().get(`/api/orders/${id}`)).body.payload;
const setStatus = (deliveryId, status, note) =>
  api().patch(`/api/deliveries/${deliveryId}/status`).send({ status, note });

describe('Entregas — /api/deliveries', () => {
  describe('POST /api/deliveries', () => {
    it('crea la entrega de un pedido confirmado con código de seguimiento', async () => {
      const { order } = await createOrderScenario({ confirmed: true });
      const res = await api().post('/api/deliveries').send({ orderId: order._id });

      const delivery = expectSuccess(res, 201);
      expect(delivery).to.include({ status: DELIVERY_STATUS.PENDING, courier: null });
      expect(delivery.trackingCode).to.match(new RegExp(`^${TRACKING_CODE.PREFIX}-[A-Z0-9]{${TRACKING_CODE.LENGTH}}$`));
      expect(delivery.order._id).to.equal(order._id);
      expect(delivery.address).to.deep.equal(order.shippingAddress);
      expect(new Date(delivery.estimatedDeliveryDate)).to.be.greaterThan(new Date());
      expect(delivery.statusHistory.map((h) => h.status)).to.deep.equal([DELIVERY_STATUS.PENDING]);
    });

    it('con repartidor queda directamente asignada', async () => {
      const { order } = await createOrderScenario({ confirmed: true });
      const courier = await createCourier();
      const res = await api().post('/api/deliveries').send({ orderId: order._id, courierId: courier._id });

      const delivery = expectSuccess(res, 201);
      expect(delivery.status).to.equal(DELIVERY_STATUS.ASSIGNED);
      expect(delivery.courier._id).to.equal(courier._id);
    });

    it('responde 409 INVALID_STATE si el pedido no está confirmado', async () => {
      const { order } = await createOrderScenario();
      const error = expectError(await api().post('/api/deliveries').send({ orderId: order._id }), 409, 'INVALID_STATE');
      expect(error.details).to.include({ status: ORDER_STATUS.PENDING });
    });

    it('responde 409 DELIVERY_ALREADY_EXISTS si el pedido ya tiene entrega', async () => {
      const { order } = await createOrderScenario({ confirmed: true });
      await api().post('/api/deliveries').send({ orderId: order._id });
      expectError(await api().post('/api/deliveries').send({ orderId: order._id }), 409, 'DELIVERY_ALREADY_EXISTS');
    });

    it('responde 422 INVALID_ROLE si el repartidor indicado no es courier', async () => {
      const { order } = await createOrderScenario({ confirmed: true });
      const customer = await createCustomer();
      const res = await api().post('/api/deliveries').send({ orderId: order._id, courierId: customer._id });
      expectError(res, 422, 'INVALID_ROLE');
    });

    it('responde 400 y 404 ante datos inválidos o un pedido inexistente', async () => {
      expectValidationError(await api().post('/api/deliveries').send({}), ['orderId']);
      expectError(await api().post('/api/deliveries').send({ orderId: NON_EXISTENT_ID }), 404, 'ORDER_NOT_FOUND');
    });
  });

  describe('Flujo de una entrega y sincronización con el pedido', () => {
    let order;
    let courier;
    let delivery;

    beforeEach(async () => {
      ({ order } = await createOrderScenario({ confirmed: true }));
      courier = await createCourier();
      delivery = (await api().post('/api/deliveries').send({ orderId: order._id })).body.payload;
    });

    it('asignar → en camino → entregada actualiza también el pedido', async () => {
      const assigned = expectSuccess(
        await api().patch(`/api/deliveries/${delivery._id}/assign`).send({ courierId: courier._id }),
        200,
      );
      expect(assigned.status).to.equal(DELIVERY_STATUS.ASSIGNED);

      expectSuccess(await setStatus(delivery._id, DELIVERY_STATUS.IN_TRANSIT, 'Salió del depósito'), 200);
      expect((await getOrder(order._id)).status).to.equal(ORDER_STATUS.SHIPPED);

      const delivered = expectSuccess(await setStatus(delivery._id, DELIVERY_STATUS.DELIVERED), 200);
      expect(delivered.deliveredAt).to.be.a('string');
      expect(delivered.statusHistory.map((h) => h.status)).to.deep.equal([
        DELIVERY_STATUS.PENDING,
        DELIVERY_STATUS.ASSIGNED,
        DELIVERY_STATUS.IN_TRANSIT,
        DELIVERY_STATUS.DELIVERED,
      ]);
      expect((await getOrder(order._id)).status).to.equal(ORDER_STATUS.DELIVERED);
    });

    it('no permite cancelar el pedido cuando la entrega ya salió', async () => {
      await api().patch(`/api/deliveries/${delivery._id}/assign`).send({ courierId: courier._id });
      await setStatus(delivery._id, DELIVERY_STATUS.IN_TRANSIT);

      const res = await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CANCELLED });
      expect(expectError(res, 409, 'INVALID_STATE').details).to.include({ deliveryStatus: DELIVERY_STATUS.IN_TRANSIT });
    });

    it('cancelar el pedido cancela la entrega pendiente', async () => {
      await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CANCELLED });
      const found = expectSuccess(await api().get(`/api/deliveries/${delivery._id}`), 200);
      expect(found.status).to.equal(DELIVERY_STATUS.CANCELLED);
    });

    it('responde 409 INVALID_STATUS_TRANSITION con una transición no permitida', async () => {
      const error = expectError(await setStatus(delivery._id, DELIVERY_STATUS.DELIVERED), 409, 'INVALID_STATUS_TRANSITION');
      expect(error.details).to.deep.include({ from: DELIVERY_STATUS.PENDING, to: DELIVERY_STATUS.DELIVERED });
    });

    it('responde 409 INVALID_STATE si se pasa a "assigned" sin repartidor', async () => {
      expectError(await setStatus(delivery._id, DELIVERY_STATUS.ASSIGNED), 409, 'INVALID_STATE');
    });

    it('responde 400 INVALID_STATUS con un estado inexistente', async () => {
      expectError(await setStatus(delivery._id, 'perdida'), 400, 'INVALID_STATUS');
    });

    it('responde 404 si la entrega o el repartidor no existen', async () => {
      expectError(await setStatus(NON_EXISTENT_ID, DELIVERY_STATUS.CANCELLED), 404, 'DELIVERY_NOT_FOUND');
      const res = await api().patch(`/api/deliveries/${delivery._id}/assign`).send({ courierId: NON_EXISTENT_ID });
      expectError(res, 404, 'USER_NOT_FOUND');
    });
  });

  describe('GET /api/deliveries/tracking/:trackingCode', () => {
    it('devuelve el seguimiento público sin datos sensibles', async () => {
      const { order } = await createOrderScenario({ confirmed: true });
      const courier = await createCourier();
      const { trackingCode } = (
        await api().post('/api/deliveries').send({ orderId: order._id, courierId: courier._id })
      ).body.payload;

      const tracking = expectSuccess(await api().get(`/api/deliveries/tracking/${trackingCode.toLowerCase()}`), 200);
      expect(tracking).to.include({ trackingCode, status: DELIVERY_STATUS.ASSIGNED });
      expect(tracking.address).to.deep.equal({ city: order.shippingAddress.city });
      expect(tracking.courier).to.deep.equal({ firstName: courier.firstName, vehicleType: courier.vehicleType });
      expect(tracking).to.not.have.any.keys('order');
    });

    it('responde 404 DELIVERY_NOT_FOUND con un código inexistente', async () => {
      const error = expectError(await api().get('/api/deliveries/tracking/SN-XXXXXXXXXX'), 404, 'DELIVERY_NOT_FOUND');
      expect(error.details).to.deep.equal({ trackingCode: 'SN-XXXXXXXXXX' });
    });
  });

  describe('GET /api/deliveries', () => {
    it('lista las entregas sin el historial (respuesta liviana)', async () => {
      const { order } = await createOrderScenario({ confirmed: true });
      await api().post('/api/deliveries').send({ orderId: order._id });

      const { payload, pagination } = expectPaginated(await api().get('/api/deliveries'));
      expect(pagination.total).to.equal(1);
      expect(payload[0]).to.not.have.property('statusHistory');
    });

    it('responde 400 con un filtro de estado inválido', async () => {
      expectValidationError(await api().get('/api/deliveries').query({ status: 'perdida' }), ['status']);
    });
  });
});
