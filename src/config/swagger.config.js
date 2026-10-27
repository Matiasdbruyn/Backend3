import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../docs/openapi.js';

const swaggerUiOptions = {
  customSiteTitle: 'ShipNow API · Documentación',
  swaggerOptions: {
    docExpansion: 'none', // tags colapsados al abrir
    tagsSorter: 'alpha',
    displayRequestDuration: true,
  },
};

/**
 * Router de la documentación (se monta en /api/docs):
 *   GET /api/docs               → Swagger UI interactivo
 *   GET /api/docs/openapi.json  → especificación OpenAPI en JSON
 */
export const docsRouter = Router();

docsRouter.get('/openapi.json', (req, res) => res.json(openApiSpec));
// Archivos estáticos de Swagger UI (css/js). /api/docs redirige a /api/docs/
docsRouter.use(swaggerUi.serve);
docsRouter.get('/', swaggerUi.setup(openApiSpec, swaggerUiOptions));
