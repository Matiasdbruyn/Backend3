import path from 'node:path';
import { config } from '../config/env.config.js';
import { LOG_LEVELS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

const TEST_MESSAGES = {
  debug: 'Detalle interno para depuración',
  http: 'Simulación de una request HTTP registrada',
  info: 'Evento informativo de funcionamiento normal',
  warning: 'Advertencia: algo inesperado pero no crítico',
  error: 'Error simulado: falló una operación',
  fatal: 'Falla crítica simulada: el servidor no podría continuar',
};

/**
 * Herramienta interna (no es una funcionalidad de negocio): emite un log de
 * cada nivel para verificar que la configuración de Winston funciona y
 * que cada nivel llega a donde corresponde.
 */
export class LoggerService {
  constructor({ logger, config }) {
    this.logger = logger;
    this.config = config;
  }

  runTest() {
    // De menos grave (debug) a más grave (fatal)
    const levels = Object.entries(LOG_LEVELS)
      .sort(([, a], [, b]) => b - a)
      .map(([level, priority]) => {
        this.logger[level](`[logger-test] ${TEST_MESSAGES[level]}`);
        return { level, priority, ...this.#describeOutputs(level, priority) };
      });

    return {
      environment: this.config.nodeEnv,
      activeLevel: this.logger.level,
      consoleEnabled: this.config.isDevelopment,
      logDir: path.relative(process.cwd(), this.config.logDir) || '.',
      files: {
        error: 'error-AAAA-MM-DD.log (solo niveles error y fatal)',
        combined: `combined-AAAA-MM-DD.log (desde el nivel ${this.logger.level})`,
      },
      levels,
    };
  }

  #describeOutputs(level, priority) {
    const enabled = this.logger.isLevelEnabled(level);
    if (!enabled) return { enabled, writtenTo: [] };

    const writtenTo = ['combined'];
    if (priority <= LOG_LEVELS.error) writtenTo.push('error');
    if (this.config.isDevelopment) writtenTo.push('console');
    return { enabled, writtenTo };
  }
}

export const loggerService = new LoggerService({ logger, config });
