import { ERROR_DICTIONARY } from './errorDictionary.js';

/**
 * Error base de la aplicación. Todos los errores "esperados" del dominio
 * extienden de esta clase, así el middleware global sabe cómo responderlos.
 */
export class AppError extends Error {
  /**
   * @param {object} definition entrada del ERROR_DICTIONARY
   * @param {object} [options]
   * @param {string} [options.message] mensaje específico (reemplaza al del diccionario)
   * @param {*} [options.details] información extra útil para el cliente
   * @param {Error} [options.cause] error original (solo para logs, nunca se expone)
   */
  constructor(definition = ERROR_DICTIONARY.INTERNAL_SERVER_ERROR, { message, details, cause } = {}) {
    super(message ?? definition.message, { cause });
    this.name = this.constructor.name;
    this.code = definition.code;
    this.statusCode = definition.statusCode;
    this.details = details;
  }
}
