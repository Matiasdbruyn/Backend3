import { Router } from 'express';
import * as productsController from '../controllers/products.controller.js';

const router = Router();

router.get('/', productsController.getProducts);
router.get('/:id', productsController.getProductById);
router.post('/', productsController.createProduct);
router.put('/:id', productsController.updateProduct);
router.delete('/:id', productsController.deleteProduct);

export default router;
