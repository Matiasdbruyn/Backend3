import { responseRef, successResponse } from '../components/responses.js';

export const loggerPaths = {
  '/api/logger/test': {
    get: {
      tags: ['Logger'],
      summary: 'Probar el logger (herramienta interna)',
      description: [
        '**No es una funcionalidad de negocio**: es una herramienta para validar la configuración de Winston.',
        '',
        'Emite un log de cada nivel (`debug`, `http`, `info`, `warning`, `error`, `fatal`) y devuelve qué niveles están',
        'habilitados en el entorno actual y a qué salidas llegó cada uno:',
        '- `combined-AAAA-MM-DD.log`: todos los niveles habilitados.',
        '- `error-AAAA-MM-DD.log`: solo `error` y `fatal`.',
        '- consola: solo en development.',
      ].join('\n'),
      responses: {
        200: successResponse('Logs de prueba generados', 'LoggerTestResult'),
        500: responseRef('InternalError'),
      },
    },
  },
};
