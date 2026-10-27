import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LOG_COLORS, LOG_LEVELS, LOG_ROTATION } from '../constants/index.js';

/**
 * Configuración de Winston. Este módulo NO lee la configuración de entorno:
 * recibe todo por parámetro, así también se puede usar para registrar un
 * error fatal cuando la propia configuración es inválida.
 * La instancia que usa la app está en src/utils/logger.js.
 */

winston.addColors(LOG_COLORS);
const colorizer = winston.format.colorize();
const { combine, errors, printf, timestamp } = winston.format;

// "[warning]" es la etiqueta más larga: todas se alinean a ese ancho
const LABEL_WIDTH = Math.max(...Object.keys(LOG_LEVELS).map((level) => level.length)) + 2;

/**
 * Formato de cada línea:
 *   2026-10-27 10:12:03 [info]    Mensaje {"meta":"opcional"}
 *   (y en la línea siguiente el stack, si lo hay)
 */
const lineFormat = ({ colors }) =>
  printf(({ timestamp: time, level, message, stack, ...meta }) => {
    const label = `[${level}]`.padEnd(LABEL_WIDTH);
    const metaText = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    const stackText = stack ? `\n${stack}` : '';
    return `${time} ${colors ? colorizer.colorize(level, label) : label} ${message}${metaText}${stackText}`;
  });

const rotatingFile = (logDir, filename, level) =>
  new DailyRotateFile({
    dirname: logDir,
    filename,
    level,
    datePattern: LOG_ROTATION.DATE_PATTERN,
    maxSize: LOG_ROTATION.MAX_SIZE,
    maxFiles: LOG_ROTATION.MAX_FILES,
    format: lineFormat({ colors: false }),
  });

/**
 * @param {object} options
 * @param {string} options.level nivel mínimo a registrar
 * @param {string} options.logDir carpeta donde se guardan los archivos
 * @param {boolean} options.console si se muestra también por consola
 */
export const createAppLogger = ({ level, logDir, console: useConsole }) => {
  const transports = [
    // Solo error y fatal (los niveles más graves que "error")
    rotatingFile(logDir, 'error-%DATE%.log', 'error'),
    // Toda la actividad desde el nivel configurado
    rotatingFile(logDir, 'combined-%DATE%.log', level),
  ];
  if (useConsole) {
    transports.push(new winston.transports.Console({ format: lineFormat({ colors: true }) }));
  }

  const logger = winston.createLogger({
    levels: LOG_LEVELS,
    level,
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
    transports,
    exitOnError: false,
  });
  // Una falla del propio logger (ej. escribir después de cerrarlo) no debe tirar abajo la app
  logger.on('error', (error) => process.stderr.write(`[logger] ${error.message}\n`));
  return logger;
};

/**
 * Cierra el logger esperando a que se escriban los archivos.
 * Se usa antes de un process.exit() para no perder el último log.
 */
const closingLoggers = new WeakMap();

export const closeLogger = (logger, timeoutMs = 2000) => {
  // Si ya se está cerrando, devuelve la misma promesa (llamarlo dos veces no rompe nada)
  if (!closingLoggers.has(logger)) {
    const closing = new Promise((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      logger.on('finish', () => {
        clearTimeout(timer);
        // Margen para que los streams de archivo terminen de volcar a disco
        setTimeout(resolve, 100);
      });
      logger.end();
    });
    closingLoggers.set(logger, closing);
  }
  return closingLoggers.get(logger);
};
