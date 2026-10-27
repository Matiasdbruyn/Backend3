import { expect } from 'chai';

/** Valida la estructura de una respuesta exitosa: { status: 'success', payload, ... } */
export const expectSuccess = (res, statusCode) => {
  expect(res.status, JSON.stringify(res.body)).to.equal(statusCode);
  expect(res.headers['content-type']).to.match(/application\/json/);
  expect(res.body).to.include({ status: 'success' });
  expect(res.body).to.have.property('payload');
  return res.body.payload;
};

/** Valida una respuesta paginada y devuelve { payload, pagination } */
export const expectPaginated = (res) => {
  const payload = expectSuccess(res, 200);
  expect(payload).to.be.an('array');
  expect(res.body.pagination).to.include.all.keys(
    'total',
    'page',
    'limit',
    'totalPages',
    'hasPrevPage',
    'hasNextPage',
  );
  return { payload, pagination: res.body.pagination };
};

/**
 * Valida el formato de error definido por el middleware global:
 * { status, statusCode, code, message, details?, path, method, timestamp }
 */
export const expectError = (res, statusCode, code) => {
  expect(res.status, JSON.stringify(res.body)).to.equal(statusCode);
  expect(res.headers['content-type']).to.match(/application\/json/);

  const { body } = res;
  expect(body).to.include({ status: 'error', statusCode, code });
  expect(body.message).to.be.a('string').that.is.not.empty;
  expect(body.path).to.be.a('string').that.matches(/^\/api/);
  expect(body.method).to.equal(res.req.method);
  expect(new Date(body.timestamp).toISOString()).to.equal(body.timestamp);
  expect(body).to.not.have.any.keys('stack');
  return body;
};

/** Valida un VALIDATION_ERROR y que el detalle mencione los campos indicados */
export const expectValidationError = (res, fields) => {
  const body = expectError(res, 400, 'VALIDATION_ERROR');
  expect(body.details).to.be.an('array').that.is.not.empty;
  body.details.forEach((detail) => expect(detail).to.have.all.keys('field', 'message'));
  expect(body.details.map((detail) => detail.field)).to.include.members(fields);
  return body;
};
