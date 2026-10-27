import express from 'express';
import { docsRouter } from './config/swagger.config.js';
import { REQUEST_BODY_LIMIT } from './constants/index.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import apiRouter from './routes/index.js';

// La app se exporta sin levantar el servidor (así se puede testear con Supertest).
const app = express();

app.disable('x-powered-by');
app.use(requestLogger);
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

app.use('/api/docs', docsRouter);
app.use('/api', apiRouter);

// Siempre al final: 404 y manejo global de errores
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
