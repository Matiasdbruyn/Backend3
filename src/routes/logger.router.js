import { Router } from 'express';
import * as loggerController from '../controllers/logger.controller.js';

const router = Router();

// Herramienta interna para verificar la configuración de logs
router.get('/test', loggerController.testLogger);

export default router;
