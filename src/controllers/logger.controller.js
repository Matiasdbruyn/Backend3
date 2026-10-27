import { loggerService } from '../services/logger.service.js';
import { sendSuccess } from '../utils/response.js';

export const testLogger = (req, res) => {
  const result = loggerService.runTest();
  sendSuccess(res, { message: 'Se generó un log de prueba por cada nivel', payload: result });
};
