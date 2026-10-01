import { HTTP_STATUS } from '../constants/index.js';
import { mocksService } from '../services/mocks.service.js';
import { sendSuccess } from '../utils/response.js';

// ─── Sin persistir ───────────────────────────────────────────────────────────

export const getMockUsers = (req, res) => {
  sendSuccess(res, { payload: mocksService.generateUsers(req.query) });
};

export const getMockCouriers = (req, res) => {
  sendSuccess(res, { payload: mocksService.generateCouriers(req.query) });
};

export const getMockProducts = (req, res) => {
  sendSuccess(res, { payload: mocksService.generateProducts(req.query) });
};

export const getMockOrders = (req, res) => {
  sendSuccess(res, { payload: mocksService.generateOrders(req.query) });
};

export const getMockDeliveries = (req, res) => {
  sendSuccess(res, { payload: mocksService.generateDeliveries(req.query) });
};

export const getMockDataset = (req, res) => {
  sendSuccess(res, { payload: mocksService.generateDataset(req.query) });
};

// ─── Persistiendo en MongoDB ─────────────────────────────────────────────────

export const seedMocks = async (req, res) => {
  const result = await mocksService.seed(req.query);
  sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: `Se insertaron ${result.inserted} registros de prueba en "${result.collection}"`,
    payload: result,
  });
};

export const generateMockData = async (req, res) => {
  const result = await mocksService.generateData(req.body);
  sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Datos de prueba insertados correctamente',
    payload: result,
  });
};
