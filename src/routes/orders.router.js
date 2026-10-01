import { Router } from 'express';
import * as ordersController from '../controllers/orders.controller.js';

const router = Router();

router.get('/', ordersController.getOrders);
router.get('/:id', ordersController.getOrderById);
router.post('/', ordersController.createOrder);
router.put('/:id', ordersController.updateOrder);
router.patch('/:id/status', ordersController.updateOrderStatus);
router.delete('/:id', ordersController.deleteOrder);

export default router;
