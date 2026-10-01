import { Router } from 'express';
import * as deliveriesController from '../controllers/deliveries.controller.js';

const router = Router();

router.get('/', deliveriesController.getDeliveries);
router.get('/tracking/:trackingCode', deliveriesController.trackDelivery);
router.get('/:id', deliveriesController.getDeliveryById);
router.post('/', deliveriesController.createDelivery);
router.patch('/:id/assign', deliveriesController.assignCourier);
router.patch('/:id/status', deliveriesController.updateDeliveryStatus);

export default router;
