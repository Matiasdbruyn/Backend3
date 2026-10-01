import { AppError } from './AppError.js';
import { ERROR_DICTIONARY as E } from './errorDictionary.js';

// ─── Generales ───────────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  /** @param {Array<{ field: string, message: string }>} details */
  constructor(details, message) {
    super(E.VALIDATION_ERROR, { message, details });
  }
}

export class InvalidIdError extends AppError {
  constructor(id, field = 'id') {
    super(E.INVALID_ID, {
      message: `El valor "${id}" no es un identificador válido`,
      details: { field, value: id },
    });
  }
}

export class InvalidJsonError extends AppError {
  constructor() {
    super(E.INVALID_JSON);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(limit) {
    super(E.PAYLOAD_TOO_LARGE, { details: { limitBytes: limit } });
  }
}

export class RouteNotFoundError extends AppError {
  constructor(method, path) {
    super(E.ROUTE_NOT_FOUND, { message: `La ruta ${method} ${path} no existe` });
  }
}

export class DuplicateKeyError extends AppError {
  constructor(fields, cause) {
    super(E.DUPLICATE_KEY, { details: fields, cause });
  }
}

export class DatabaseError extends AppError {
  constructor(cause) {
    super(E.DATABASE_ERROR, { cause });
  }
}

// ─── Recursos no encontrados ─────────────────────────────────────────────────

export class UserNotFoundError extends AppError {
  constructor(criteria) {
    super(E.USER_NOT_FOUND, { details: criteria });
  }
}

export class ProductNotFoundError extends AppError {
  constructor(criteria) {
    super(E.PRODUCT_NOT_FOUND, { details: criteria });
  }
}

export class OrderNotFoundError extends AppError {
  constructor(criteria) {
    super(E.ORDER_NOT_FOUND, { details: criteria });
  }
}

export class DeliveryNotFoundError extends AppError {
  constructor(criteria) {
    super(E.DELIVERY_NOT_FOUND, { details: criteria });
  }
}

// ─── Reglas de negocio ───────────────────────────────────────────────────────

export class EmailAlreadyExistsError extends AppError {
  constructor(email) {
    super(E.EMAIL_ALREADY_EXISTS, { details: { email } });
  }
}

export class ProductCodeAlreadyExistsError extends AppError {
  constructor(code) {
    super(E.PRODUCT_CODE_ALREADY_EXISTS, { details: { code } });
  }
}

export class DeliveryAlreadyExistsError extends AppError {
  constructor(orderId, deliveryId) {
    super(E.DELIVERY_ALREADY_EXISTS, { details: { orderId, deliveryId } });
  }
}

export class InvalidRoleError extends AppError {
  constructor(message, details) {
    super(E.INVALID_ROLE, { message, details });
  }
}

export class InvalidStatusError extends AppError {
  constructor(status, allowed, message) {
    super(E.INVALID_STATUS, {
      message: message ?? `El estado "${status}" no es válido`,
      details: { received: status, allowed },
    });
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from, to, allowed) {
    super(E.INVALID_STATUS_TRANSITION, {
      message: `No se puede pasar del estado "${from}" a "${to}"`,
      details: { from, to, allowed },
    });
  }
}

export class InvalidStateError extends AppError {
  constructor(message, details) {
    super(E.INVALID_STATE, { message, details });
  }
}

export class InsufficientStockError extends AppError {
  constructor(details) {
    super(E.INSUFFICIENT_STOCK, { details });
  }
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

export class InvalidMockQuantityError extends AppError {
  constructor(message, details) {
    super(E.INVALID_MOCK_QUANTITY, { message, details });
  }
}

export class InvalidMockCollectionError extends AppError {
  constructor(collection, allowed) {
    super(E.INVALID_MOCK_COLLECTION, {
      message: `La colección "${collection}" no admite datos de prueba`,
      details: { received: collection, allowed },
    });
  }
}

export class MockDependencyError extends AppError {
  constructor(message, details) {
    super(E.MOCK_DEPENDENCY_MISSING, { message, details });
  }
}

export class MockSeedError extends AppError {
  constructor(cause, details) {
    super(E.MOCK_SEED_FAILED, { cause, details });
  }
}
