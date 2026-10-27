import { expect } from 'chai';
import { expectError } from './helpers/assertions.js';
import { api } from './helpers/fixtures.js';

const REQUIRED_TAGS = ['Users', 'Orders', 'Deliveries', 'Mocks', 'Logger'];
const REQUIRED_SCHEMAS = ['User', 'Order', 'OrderItem', 'Delivery', 'ErrorResponse', 'SuccessResponse'];

describe('Documentación — Swagger', () => {
  it('GET /api/docs/ sirve Swagger UI', async () => {
    const res = await api().get('/api/docs/');
    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.match(/text\/html/);
    expect(res.text).to.include('swagger-ui').and.include('ShipNow API');
  });

  it('GET /api/docs redirige a /api/docs/', async () => {
    const res = await api().get('/api/docs');
    expect(res.status).to.equal(301);
    expect(res.headers.location).to.equal('/api/docs/');
  });

  it('GET /api/docs/openapi.json devuelve la especificación con tags y schemas', async () => {
    const res = await api().get('/api/docs/openapi.json');
    expect(res.status).to.equal(200);

    const spec = res.body;
    expect(spec.openapi).to.match(/^3\./);
    expect(spec.info).to.include({ title: 'ShipNow API', version: '1.0.0' });
    expect(spec.servers).to.be.an('array').that.is.not.empty;
    expect(spec.tags.map((tag) => tag.name)).to.include.members(REQUIRED_TAGS);
    expect(spec.components.schemas).to.include.all.keys(REQUIRED_SCHEMAS);
  });

  it('cada operación documentada tiene tag, respuesta exitosa y respuestas de error', async () => {
    const { paths } = (await api().get('/api/docs/openapi.json')).body;
    for (const [path, operations] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        const label = `${method.toUpperCase()} ${path}`;
        const codes = Object.keys(operation.responses).map(Number);
        expect(operation.tags, label).to.have.lengthOf(1);
        expect(codes.some((code) => code < 300), `${label} sin respuesta exitosa`).to.equal(true);
        expect(codes.some((code) => code >= 400), `${label} sin respuestas de error`).to.equal(true);
      }
    }
  });

  it('todas las rutas documentadas existen en la API con el método documentado', async () => {
    const { paths } = (await api().get('/api/docs/openapi.json')).body;

    for (const [path, operations] of Object.entries(paths)) {
      // /api/users/{id} → /api/users/6650a1b2c3d4e5f6a7b8c9d0
      const realPath = path.replace(/\{[^}]+\}/g, '6650a1b2c3d4e5f6a7b8c9d0');
      // OPTIONS no ejecuta el handler: Express responde con los métodos que tiene la ruta
      const res = await api().options(realPath);
      expect(res.status, `${path} no existe en la API`).to.equal(200);

      const allowed = res.headers.allow.split(',').map((m) => m.trim().toLowerCase());
      expect(allowed, path).to.include.members(Object.keys(operations));
    }
  });

  it('una ruta inexistente dentro de /api/docs responde 404 ROUTE_NOT_FOUND', async () => {
    expectError(await api().get('/api/docs/no-existe'), 404, 'ROUTE_NOT_FOUND');
  });
});
