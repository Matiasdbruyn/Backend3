import { config } from '../config/env.config.js';
import { parameters } from './components/parameters.js';
import { responses } from './components/responses.js';
import { schemas } from './components/schemas.js';
import { deliveriesPaths } from './paths/deliveries.paths.js';
import { loggerPaths } from './paths/logger.paths.js';
import { mocksPaths } from './paths/mocks.paths.js';
import { ordersPaths } from './paths/orders.paths.js';
import { productsPaths } from './paths/products.paths.js';
import { usersPaths } from './paths/users.paths.js';

const description = `
API REST de **ShipNow**, una plataforma de pedidos y entregas a domicilio.

Propósito: gestionar usuarios (clientes, repartidores y administradores), el catálogo de productos,
los pedidos y sus entregas con seguimiento por código. Incluye un módulo de datos simulados (mocks)
y una herramienta interna para validar el logger.

**Formato de respuestas**

- Éxito: \`{ "status": "success", "message"?, "payload", "pagination"? }\`
- Error: \`{ "status": "error", "statusCode", "code", "message", "details"?, "path", "method", "timestamp" }\`.
  El \`code\` sale del diccionario de errores y es estable para usar en el cliente.
- Una ruta inexistente responde \`404 ROUTE_NOT_FOUND\`; un body que no es JSON válido, \`400 INVALID_JSON\`.

**Autenticación:** esta versión de la API no requiere autenticación.
`.trim();

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShipNow API',
    version: '1.0.0',
    description,
  },
  servers: [{ url: `http://localhost:${config.port}`, description: 'Servidor local' }],
  tags: [
    { name: 'Users', description: 'Usuarios: clientes, repartidores y administradores' },
    { name: 'Products', description: 'Catálogo de productos y stock' },
    { name: 'Orders', description: 'Pedidos de los clientes (envíos)' },
    { name: 'Deliveries', description: 'Entregas: asignación de repartidor, estados y seguimiento' },
    { name: 'Mocks', description: 'Generación de datos simulados y carga de datos de prueba' },
    { name: 'Logger', description: 'Herramienta interna para validar la configuración de logs' },
  ],
  paths: {
    ...usersPaths,
    ...productsPaths,
    ...ordersPaths,
    ...deliveriesPaths,
    ...mocksPaths,
    ...loggerPaths,
  },
  components: { schemas, responses, parameters },
};
