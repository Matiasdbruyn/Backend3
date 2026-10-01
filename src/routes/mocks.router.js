import { Router } from 'express';
import * as mocksController from '../controllers/mocks.controller.js';

const router = Router();

// Datos simulados (no se guardan)
router.get('/users', mocksController.getMockUsers);
router.get('/couriers', mocksController.getMockCouriers);
router.get('/products', mocksController.getMockProducts);
router.get('/orders', mocksController.getMockOrders);
router.get('/deliveries', mocksController.getMockDeliveries);
router.get('/dataset', mocksController.getMockDataset);

// Carga controlada en MongoDB
router.post('/seed', mocksController.seedMocks);
router.post('/generateData', mocksController.generateMockData);

export default router;
