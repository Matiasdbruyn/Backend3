import { expect } from 'chai';
import { PRODUCT_STATUS } from '../src/constants/index.js';
import {
  expectError,
  expectPaginated,
  expectSuccess,
  expectValidationError,
} from './helpers/assertions.js';
import { api, buildProductBody, createProduct, NON_EXISTENT_ID } from './helpers/fixtures.js';

describe('Productos — /api/products', () => {
  describe('POST /api/products', () => {
    it('crea el producto y calcula el estado según el stock', async () => {
      const withStock = expectSuccess(await api().post('/api/products').send(buildProductBody({ stock: 5 })), 201);
      const withoutStock = expectSuccess(await api().post('/api/products').send(buildProductBody({ stock: 0 })), 201);

      expect(withStock.status).to.equal(PRODUCT_STATUS.AVAILABLE);
      expect(withoutStock.status).to.equal(PRODUCT_STATUS.OUT_OF_STOCK);
    });

    it('guarda el código en mayúsculas y responde 409 si se repite', async () => {
      await createProduct({ code: 'box-m' });
      const res = await api().post('/api/products').send(buildProductBody({ code: 'BOX-M' }));
      const error = expectError(res, 409, 'PRODUCT_CODE_ALREADY_EXISTS');
      expect(error.details).to.deep.equal({ code: 'BOX-M' });
    });

    it('responde 400 si se envía el status (lo calcula la API) o datos inválidos', async () => {
      const res = await api()
        .post('/api/products')
        .send(buildProductBody({ price: -1, status: PRODUCT_STATUS.AVAILABLE }));
      expectValidationError(res, ['price', 'status']);
    });
  });

  describe('GET /api/products', () => {
    it('por defecto oculta los productos sin stock', async () => {
      await createProduct({ stock: 3 });
      await createProduct({ stock: 0 });

      const { payload } = expectPaginated(await api().get('/api/products'));
      expect(payload).to.have.lengthOf(1);
      expect(payload[0].status).to.equal(PRODUCT_STATUS.AVAILABLE);

      const all = expectPaginated(await api().get('/api/products').query({ includeOutOfStock: 'true' }));
      expect(all.pagination.total).to.equal(2);
    });

    it('responde 400 con filtros inválidos', async () => {
      const res = await api().get('/api/products').query({ status: 'agotado', minPrice: -3 });
      expectValidationError(res, ['status', 'minPrice']);
    });
  });

  describe('GET /api/products/:id', () => {
    it('devuelve el producto', async () => {
      const created = await createProduct();
      expect(expectSuccess(await api().get(`/api/products/${created._id}`), 200)).to.include({ code: created.code });
    });

    it('responde 404 PRODUCT_NOT_FOUND si no existe', async () => {
      expectError(await api().get(`/api/products/${NON_EXISTENT_ID}`), 404, 'PRODUCT_NOT_FOUND');
    });
  });

  describe('PUT y DELETE /api/products/:id', () => {
    it('al dejar el stock en 0 el producto pasa a out_of_stock', async () => {
      const created = await createProduct({ stock: 4 });
      const res = await api().put(`/api/products/${created._id}`).send({ stock: 0 });
      expect(expectSuccess(res, 200)).to.include({ stock: 0, status: PRODUCT_STATUS.OUT_OF_STOCK });
    });

    it('elimina el producto y responde 404 al repetir la operación', async () => {
      const created = await createProduct();
      expectSuccess(await api().delete(`/api/products/${created._id}`), 200);
      expectError(await api().delete(`/api/products/${created._id}`), 404, 'PRODUCT_NOT_FOUND');
    });
  });
});
