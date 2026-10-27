import { expect } from 'chai';
import { LOG_LEVELS } from '../src/constants/index.js';
import { expectError, expectSuccess } from './helpers/assertions.js';
import { api } from './helpers/fixtures.js';

describe('Logger — /api/logger/test', () => {
  it('genera un log por nivel e informa qué niveles están activos en el entorno de test', async () => {
    const res = await api().get('/api/logger/test');
    const result = expectSuccess(res, 200);

    expect(res.body.message).to.equal('Se generó un log de prueba por cada nivel');
    expect(result).to.include({ environment: 'test', activeLevel: 'info', consoleEnabled: false });
    expect(result.levels.map((l) => l.level)).to.deep.equal(['debug', 'http', 'info', 'warning', 'error', 'fatal']);

    const byLevel = Object.fromEntries(result.levels.map((l) => [l.level, l]));
    // En test el nivel mínimo es info: debug y http no se registran
    expect(byLevel.debug).to.include({ enabled: false, priority: LOG_LEVELS.debug });
    expect(byLevel.http.enabled).to.equal(false);
    expect(byLevel.info.writtenTo).to.deep.equal(['combined']);
    // error y fatal también van al archivo de errores; nunca a consola en test
    expect(byLevel.error.writtenTo).to.deep.equal(['combined', 'error']);
    expect(byLevel.fatal.writtenTo).to.deep.equal(['combined', 'error']);
  });

  it('responde 404 ROUTE_NOT_FOUND con un método no soportado', async () => {
    const error = expectError(await api().post('/api/logger/test'), 404, 'ROUTE_NOT_FOUND');
    expect(error.message).to.equal('La ruta POST /api/logger/test no existe');
  });
});
