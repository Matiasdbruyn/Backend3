import { expect } from 'chai';
import { USER_ROLES, VEHICLE_TYPES } from '../src/constants/index.js';
import {
  expectError,
  expectPaginated,
  expectSuccess,
  expectValidationError,
} from './helpers/assertions.js';
import {
  api,
  buildUserBody,
  createCourier,
  createCustomer,
  NON_EXISTENT_ID,
} from './helpers/fixtures.js';

describe('Usuarios — /api/users', () => {
  describe('GET /api/users', () => {
    it('devuelve una lista vacía y la paginación cuando no hay usuarios', async () => {
      const { payload, pagination } = expectPaginated(await api().get('/api/users'));
      expect(payload).to.deep.equal([]);
      expect(pagination).to.include({ total: 0, page: 1, limit: 10 });
    });

    it('lista los usuarios sin exponer la contraseña', async () => {
      await createCustomer();
      await createCourier();

      const { payload, pagination } = expectPaginated(await api().get('/api/users'));
      expect(pagination.total).to.equal(2);
      payload.forEach((user) => {
        expect(user).to.include.all.keys('_id', 'firstName', 'lastName', 'email', 'role');
        expect(user).to.not.have.property('password');
      });
    });

    it('filtra por rol y respeta el límite de la paginación', async () => {
      await createCustomer();
      await createCustomer();
      await createCourier();

      const res = await api().get('/api/users').query({ role: USER_ROLES.USER, limit: 1 });
      const { payload, pagination } = expectPaginated(res);
      expect(payload).to.have.lengthOf(1);
      expect(payload[0].role).to.equal(USER_ROLES.USER);
      expect(pagination).to.include({ total: 2, limit: 1, totalPages: 2, hasNextPage: true });
    });

    it('responde 400 VALIDATION_ERROR con un rol o una paginación inválidos', async () => {
      const res = await api().get('/api/users').query({ role: 'superadmin', limit: 500 });
      expectValidationError(res, ['role', 'limit']);
    });
  });

  describe('POST /api/users', () => {
    it('crea un cliente con rol "user" por defecto y sin devolver la contraseña', async () => {
      const { role, vehicleType, ...body } = buildUserBody();
      const res = await api().post('/api/users').send({ ...body, email: 'ANA@Test.com ' });

      const user = expectSuccess(res, 201);
      expect(res.body.message).to.equal('Usuario creado');
      expect(user).to.include({ email: 'ana@test.com', role: USER_ROLES.USER });
      expect(user._id).to.match(/^[a-f\d]{24}$/);
      expect(user).to.not.have.property('password');
    });

    it('crea un repartidor con su vehículo', async () => {
      const res = await api().post('/api/users').send(buildUserBody(USER_ROLES.COURIER));
      const user = expectSuccess(res, 201);
      expect(user.role).to.equal(USER_ROLES.COURIER);
      expect(Object.values(VEHICLE_TYPES)).to.include(user.vehicleType);
    });

    it('responde 400 VALIDATION_ERROR con datos incompletos', async () => {
      const res = await api().post('/api/users').send({ firstName: 'Ana' });
      expectValidationError(res, ['lastName', 'email', 'password']);
    });

    it('responde 400 si un repartidor no indica vehículo', async () => {
      const body = buildUserBody(USER_ROLES.COURIER, { vehicleType: undefined });
      const res = await api().post('/api/users').send(body);
      const error = expectValidationError(res, ['vehicleType']);
      expect(error.details[0].message).to.match(/vehículo/);
    });

    it('responde 400 si se envía un campo no permitido', async () => {
      const res = await api().post('/api/users').send(buildUserBody(USER_ROLES.USER, { isAdmin: true }));
      expectValidationError(res, ['isAdmin']);
    });

    it('responde 409 EMAIL_ALREADY_EXISTS si el email ya está registrado', async () => {
      const existing = await createCustomer();
      const res = await api().post('/api/users').send(buildUserBody(USER_ROLES.USER, { email: existing.email }));
      const error = expectError(res, 409, 'EMAIL_ALREADY_EXISTS');
      expect(error.details).to.deep.equal({ email: existing.email });
    });
  });

  describe('GET /api/users/:id', () => {
    it('devuelve el usuario solicitado', async () => {
      const created = await createCustomer();
      const user = expectSuccess(await api().get(`/api/users/${created._id}`), 200);
      expect(user).to.include({ _id: created._id, email: created.email });
    });

    it('responde 404 USER_NOT_FOUND si el usuario no existe', async () => {
      const res = await api().get(`/api/users/${NON_EXISTENT_ID}`);
      const error = expectError(res, 404, 'USER_NOT_FOUND');
      expect(error.details).to.deep.equal({ id: NON_EXISTENT_ID });
    });

    it('responde 400 INVALID_ID si el id no tiene formato válido', async () => {
      const error = expectError(await api().get('/api/users/123'), 400, 'INVALID_ID');
      expect(error.details).to.deep.equal({ field: 'id', value: '123' });
    });
  });

  describe('PUT /api/users/:id', () => {
    it('actualiza los campos enviados', async () => {
      const created = await createCustomer();
      const res = await api().put(`/api/users/${created._id}`).send({ firstName: 'Nuevo' });
      expect(expectSuccess(res, 200)).to.include({ _id: created._id, firstName: 'Nuevo' });
    });

    it('elimina el vehículo cuando un repartidor pasa a ser cliente', async () => {
      const courier = await createCourier();
      const res = await api().put(`/api/users/${courier._id}`).send({ role: USER_ROLES.USER });
      const user = expectSuccess(res, 200);
      expect(user.role).to.equal(USER_ROLES.USER);
      expect(user).to.not.have.property('vehicleType');
    });

    it('responde 400 si el body está vacío', async () => {
      const created = await createCustomer();
      expectValidationError(await api().put(`/api/users/${created._id}`).send({}), ['body']);
    });

    it('responde 404 si el usuario no existe', async () => {
      const res = await api().put(`/api/users/${NON_EXISTENT_ID}`).send({ firstName: 'X' });
      expectError(res, 404, 'USER_NOT_FOUND');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('elimina el usuario y luego ya no se encuentra', async () => {
      const created = await createCustomer();
      const res = await api().delete(`/api/users/${created._id}`);
      expect(expectSuccess(res, 200)._id).to.equal(created._id);
      expect(res.body.message).to.equal('Usuario eliminado');

      expectError(await api().get(`/api/users/${created._id}`), 404, 'USER_NOT_FOUND');
    });

    it('responde 404 si el usuario no existe', async () => {
      expectError(await api().delete(`/api/users/${NON_EXISTENT_ID}`), 404, 'USER_NOT_FOUND');
    });
  });
});
