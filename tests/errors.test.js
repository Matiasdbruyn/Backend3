import { expect } from 'chai';
import { REQUEST_BODY_LIMIT } from '../src/constants/index.js';
import { expectError } from './helpers/assertions.js';
import { api } from './helpers/fixtures.js';

describe('Manejo global de errores', () => {
  it('una ruta inexistente responde 404 ROUTE_NOT_FOUND con el formato estándar', async () => {
    const error = expectError(await api().get('/api/no-existe'), 404, 'ROUTE_NOT_FOUND');
    expect(error).to.include({ message: 'La ruta GET /api/no-existe no existe', path: '/api/no-existe' });
    expect(error).to.not.have.property('details');
  });

  it('un body que no es JSON válido responde 400 INVALID_JSON', async () => {
    const res = await api().post('/api/users').set('Content-Type', 'application/json').send('{"firstName": ');
    expectError(res, 400, 'INVALID_JSON');
  });

  it(`un body mayor a ${REQUEST_BODY_LIMIT} responde 413 PAYLOAD_TOO_LARGE`, async () => {
    const res = await api().post('/api/users').send({ firstName: 'a'.repeat(120 * 1024) });
    expectError(res, 413, 'PAYLOAD_TOO_LARGE');
  });
});
