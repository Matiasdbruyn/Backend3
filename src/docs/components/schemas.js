import {
  DELIVERY_STATUS,
  LOG_LEVELS,
  MOCK_COLLECTIONS,
  MOCKS,
  ORDER_PRIORITY,
  ORDER_STATUS,
  PAGINATION,
  PRODUCT_STATUS,
  USER_ROLES,
  VEHICLE_TYPES,
} from '../../constants/index.js';
import { ERROR_DICTIONARY } from '../../errors/index.js';

// Los enums se arman desde las constantes del proyecto: la documentación
// siempre muestra los mismos valores que valida la API.
const values = (constants) => Object.values(constants);
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const objectId = (example = '6650a1b2c3d4e5f6a7b8c9d0', description) => ({
  type: 'string',
  pattern: '^[a-f\\d]{24}$',
  example,
  ...(description && { description }),
});
const dateTime = (example = '2026-10-27T15:00:00.000Z') => ({ type: 'string', format: 'date-time', example });
const timestamps = { createdAt: dateTime(), updatedAt: dateTime() };
const mockQuantity = (field, example) => ({
  type: 'integer',
  minimum: 0,
  maximum: MOCKS.MAX_QTY,
  default: MOCKS.DATASET_DEFAULTS[field],
  example,
});

export const schemas = {
  // ─── Respuestas genéricas ──────────────────────────────────────────────────
  SuccessResponse: {
    type: 'object',
    description: 'Estructura de toda respuesta exitosa',
    required: ['status', 'payload'],
    properties: {
      status: { type: 'string', enum: ['success'], example: 'success' },
      message: { type: 'string', example: 'Operación realizada' },
      payload: { description: 'Datos de la respuesta (objeto o lista según el endpoint)' },
    },
  },
  Pagination: {
    type: 'object',
    properties: {
      total: { type: 'integer', example: 42 },
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: PAGINATION.DEFAULT_LIMIT },
      totalPages: { type: 'integer', example: 5 },
      hasPrevPage: { type: 'boolean', example: false },
      hasNextPage: { type: 'boolean', example: true },
    },
  },
  ErrorResponse: {
    type: 'object',
    description: 'Estructura de toda respuesta de error (la arma el middleware global de errores)',
    required: ['status', 'statusCode', 'code', 'message', 'path', 'method', 'timestamp'],
    properties: {
      status: { type: 'string', enum: ['error'], example: 'error' },
      statusCode: { type: 'integer', description: 'Igual al status HTTP', example: 404 },
      code: {
        type: 'string',
        description: 'Código interno del diccionario de errores',
        enum: Object.keys(ERROR_DICTIONARY),
        example: 'USER_NOT_FOUND',
      },
      message: { type: 'string', example: 'El usuario solicitado no existe' },
      details: {
        description:
          'Información adicional (opcional). En VALIDATION_ERROR es una lista de { field, message }',
        oneOf: [{ type: 'object' }, { type: 'array', items: ref('FieldError') }],
      },
      path: { type: 'string', example: '/api/users/6650a1b2c3d4e5f6a7b8c9d0' },
      method: { type: 'string', example: 'GET' },
      timestamp: dateTime('2026-10-27T15:00:00.000Z'),
    },
  },
  FieldError: {
    type: 'object',
    properties: {
      field: { type: 'string', example: 'email' },
      message: { type: 'string', example: 'El email no tiene un formato válido' },
    },
  },
  Address: {
    type: 'object',
    required: ['street', 'city', 'zipCode'],
    properties: {
      street: { type: 'string', example: 'Av. Corrientes 1234' },
      city: { type: 'string', example: 'CABA' },
      zipCode: { type: 'string', example: '1043' },
    },
  },

  // ─── Usuarios ──────────────────────────────────────────────────────────────
  User: {
    type: 'object',
    description: 'Usuario (la contraseña nunca se devuelve)',
    properties: {
      _id: objectId(),
      firstName: { type: 'string', example: 'Luis' },
      lastName: { type: 'string', example: 'Gómez' },
      email: { type: 'string', format: 'email', example: 'luis@mail.com' },
      role: { type: 'string', enum: values(USER_ROLES), example: USER_ROLES.COURIER },
      phone: { type: 'string', example: '11 5555-5555' },
      vehicleType: {
        type: 'string',
        enum: values(VEHICLE_TYPES),
        description: 'Solo para repartidores (role = courier)',
        example: VEHICLE_TYPES.MOTORCYCLE,
      },
      ...timestamps,
    },
  },
  UserCreate: {
    type: 'object',
    required: ['firstName', 'lastName', 'email', 'password'],
    additionalProperties: false,
    properties: {
      firstName: { type: 'string', maxLength: 80, example: 'Luis' },
      lastName: { type: 'string', maxLength: 80, example: 'Gómez' },
      email: { type: 'string', format: 'email', example: 'luis@mail.com' },
      password: { type: 'string', minLength: 6, maxLength: 100, example: 'secreto123' },
      role: { type: 'string', enum: values(USER_ROLES), default: USER_ROLES.USER, example: USER_ROLES.COURIER },
      phone: { type: 'string', maxLength: 30, example: '11 5555-5555' },
      vehicleType: {
        type: 'string',
        enum: values(VEHICLE_TYPES),
        description: 'Obligatorio si role = courier; no se permite para otros roles',
        example: VEHICLE_TYPES.MOTORCYCLE,
      },
    },
  },
  UserUpdate: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    description: 'Uno o más campos de UserCreate',
    properties: {
      firstName: { type: 'string', example: 'Luis Alberto' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      role: { type: 'string', enum: values(USER_ROLES) },
      phone: { type: 'string', example: '11 4444-4444' },
      vehicleType: { type: 'string', enum: values(VEHICLE_TYPES) },
    },
  },
  UserSummary: {
    type: 'object',
    properties: {
      _id: objectId(),
      firstName: { type: 'string', example: 'Ana' },
      lastName: { type: 'string', example: 'Pérez' },
      email: { type: 'string', example: 'ana@mail.com' },
    },
  },

  // ─── Productos ─────────────────────────────────────────────────────────────
  Product: {
    type: 'object',
    properties: {
      _id: objectId('6650a1b2c3d4e5f6a7b8c9d1'),
      title: { type: 'string', example: 'Caja mediana' },
      description: { type: 'string', example: 'Caja de cartón 40x30x30' },
      code: { type: 'string', example: 'BOX-M' },
      price: { type: 'number', example: 1800 },
      stock: { type: 'integer', example: 40 },
      category: { type: 'string', example: 'Embalaje' },
      status: {
        type: 'string',
        enum: values(PRODUCT_STATUS),
        description: 'Se calcula según el stock',
        example: PRODUCT_STATUS.AVAILABLE,
      },
      ...timestamps,
    },
  },
  ProductCreate: {
    type: 'object',
    required: ['title', 'code', 'price', 'stock', 'category'],
    additionalProperties: false,
    description: 'El status no se envía: lo calcula la API a partir del stock',
    properties: {
      title: { type: 'string', example: 'Caja mediana' },
      description: { type: 'string', example: 'Caja de cartón 40x30x30' },
      code: { type: 'string', description: 'Único; se guarda en mayúsculas', example: 'BOX-M' },
      price: { type: 'number', minimum: 0, example: 1800 },
      stock: { type: 'integer', minimum: 0, example: 40 },
      category: { type: 'string', example: 'Embalaje' },
    },
  },
  ProductUpdate: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    description: 'Uno o más campos de ProductCreate',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      code: { type: 'string' },
      price: { type: 'number', minimum: 0, example: 2000 },
      stock: { type: 'integer', minimum: 0, example: 0 },
      category: { type: 'string' },
    },
  },

  // ─── Pedidos ───────────────────────────────────────────────────────────────
  OrderItem: {
    type: 'object',
    description: 'Ítem del pedido con el título y precio del producto al momento de la compra',
    properties: {
      product: objectId('6650a1b2c3d4e5f6a7b8c9d1'),
      title: { type: 'string', example: 'Caja mediana' },
      unitPrice: { type: 'number', example: 1800 },
      quantity: { type: 'integer', example: 2 },
      subtotal: { type: 'number', example: 3600 },
    },
  },
  OrderItemInput: {
    type: 'object',
    required: ['productId', 'quantity'],
    properties: {
      productId: objectId('6650a1b2c3d4e5f6a7b8c9d1'),
      quantity: { type: 'integer', minimum: 1, example: 2 },
    },
  },
  Order: {
    type: 'object',
    properties: {
      _id: objectId('6650a1b2c3d4e5f6a7b8c9d2'),
      user: ref('UserSummary'),
      items: { type: 'array', items: ref('OrderItem') },
      priority: { type: 'string', enum: values(ORDER_PRIORITY), example: ORDER_PRIORITY.HIGH },
      status: { type: 'string', enum: values(ORDER_STATUS), example: ORDER_STATUS.PENDING },
      shippingAddress: ref('Address'),
      subtotal: { type: 'number', example: 3600 },
      shippingCost: { type: 'number', description: 'Según la prioridad', example: 4500 },
      total: { type: 'number', example: 8100 },
      notes: { type: 'string', example: 'Tocar timbre' },
      ...timestamps,
    },
  },
  OrderCreate: {
    type: 'object',
    required: ['userId', 'items', 'shippingAddress'],
    additionalProperties: false,
    properties: {
      userId: objectId('6650a1b2c3d4e5f6a7b8c9d0', 'Usuario con rol "user" (cliente)'),
      items: { type: 'array', minItems: 1, items: ref('OrderItemInput') },
      priority: { type: 'string', enum: values(ORDER_PRIORITY), default: ORDER_PRIORITY.NORMAL },
      shippingAddress: ref('Address'),
      notes: { type: 'string', maxLength: 500, example: 'Tocar timbre' },
    },
  },
  OrderUpdate: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    description: 'Solo para pedidos en estado pending',
    properties: {
      priority: { type: 'string', enum: values(ORDER_PRIORITY), example: ORDER_PRIORITY.URGENT },
      shippingAddress: ref('Address'),
      notes: { type: 'string', maxLength: 500 },
    },
  },
  OrderStatusUpdate: {
    type: 'object',
    required: ['status'],
    additionalProperties: false,
    properties: {
      status: {
        type: 'string',
        enum: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
        description: `Estados que se pueden asignar a mano. "${ORDER_STATUS.SHIPPED}" y "${ORDER_STATUS.DELIVERED}" los define la entrega.`,
        example: ORDER_STATUS.CONFIRMED,
      },
    },
  },

  // ─── Entregas ──────────────────────────────────────────────────────────────
  StatusHistoryEntry: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: values(DELIVERY_STATUS), example: DELIVERY_STATUS.ASSIGNED },
      note: { type: 'string', example: 'Repartidor asignado: Luis Gómez' },
      changedAt: dateTime(),
    },
  },
  CourierSummary: {
    type: 'object',
    nullable: true,
    properties: {
      _id: objectId('6650a1b2c3d4e5f6a7b8c9d3'),
      firstName: { type: 'string', example: 'Luis' },
      lastName: { type: 'string', example: 'Gómez' },
      phone: { type: 'string', example: '11 5555-5555' },
      vehicleType: { type: 'string', enum: values(VEHICLE_TYPES), example: VEHICLE_TYPES.MOTORCYCLE },
    },
  },
  Delivery: {
    type: 'object',
    properties: {
      _id: objectId('6650a1b2c3d4e5f6a7b8c9d4'),
      order: {
        type: 'object',
        properties: {
          _id: objectId('6650a1b2c3d4e5f6a7b8c9d2'),
          status: { type: 'string', enum: values(ORDER_STATUS), example: ORDER_STATUS.CONFIRMED },
          priority: { type: 'string', enum: values(ORDER_PRIORITY), example: ORDER_PRIORITY.HIGH },
          total: { type: 'number', example: 8100 },
          user: objectId(),
        },
      },
      courier: ref('CourierSummary'),
      trackingCode: { type: 'string', example: 'SN-7YFCX59YXV' },
      status: { type: 'string', enum: values(DELIVERY_STATUS), example: DELIVERY_STATUS.ASSIGNED },
      address: ref('Address'),
      estimatedDeliveryDate: dateTime('2026-10-29T15:00:00.000Z'),
      deliveredAt: { ...dateTime(), nullable: true, example: null },
      statusHistory: {
        type: 'array',
        description: 'Se omite en los listados para que las respuestas sean más livianas',
        items: ref('StatusHistoryEntry'),
      },
      ...timestamps,
    },
  },
  DeliveryTracking: {
    type: 'object',
    description: 'Vista pública del seguimiento: sin datos sensibles del cliente ni del repartidor',
    properties: {
      _id: objectId('6650a1b2c3d4e5f6a7b8c9d4'),
      trackingCode: { type: 'string', example: 'SN-7YFCX59YXV' },
      status: { type: 'string', enum: values(DELIVERY_STATUS), example: DELIVERY_STATUS.IN_TRANSIT },
      address: { type: 'object', properties: { city: { type: 'string', example: 'CABA' } } },
      courier: {
        type: 'object',
        nullable: true,
        properties: {
          firstName: { type: 'string', example: 'Luis' },
          vehicleType: { type: 'string', enum: values(VEHICLE_TYPES), example: VEHICLE_TYPES.MOTORCYCLE },
        },
      },
      estimatedDeliveryDate: dateTime('2026-10-29T15:00:00.000Z'),
      deliveredAt: { ...dateTime(), nullable: true, example: null },
      statusHistory: { type: 'array', items: ref('StatusHistoryEntry') },
    },
  },
  DeliveryCreate: {
    type: 'object',
    required: ['orderId'],
    additionalProperties: false,
    properties: {
      orderId: objectId('6650a1b2c3d4e5f6a7b8c9d2', 'Pedido en estado confirmed'),
      courierId: objectId('6650a1b2c3d4e5f6a7b8c9d3', 'Opcional: usuario con rol courier'),
      estimatedDeliveryDate: {
        ...dateTime('2026-10-30T18:00:00.000Z'),
        description: 'Opcional y futura. Si no se envía se calcula según la prioridad del pedido',
      },
    },
  },
  DeliveryAssign: {
    type: 'object',
    required: ['courierId'],
    additionalProperties: false,
    properties: { courierId: objectId('6650a1b2c3d4e5f6a7b8c9d3', 'Usuario con rol courier') },
  },
  DeliveryStatusUpdate: {
    type: 'object',
    required: ['status'],
    additionalProperties: false,
    properties: {
      status: { type: 'string', enum: values(DELIVERY_STATUS), example: DELIVERY_STATUS.IN_TRANSIT },
      note: { type: 'string', maxLength: 300, example: 'Salió del depósito' },
    },
  },

  // ─── Mocks ─────────────────────────────────────────────────────────────────
  MockUser: {
    type: 'object',
    description: 'Usuario simulado (no se guarda). Los repartidores incluyen vehicleType',
    properties: {
      _id: objectId('e1cc4ddbf758b462a1fdb86a'),
      firstName: { type: 'string', example: 'Natalia' },
      lastName: { type: 'string', example: 'Rosario Venegas' },
      email: { type: 'string', example: 'natalia.rosariovenegas.t5jzkj@shipnow.test' },
      role: { type: 'string', enum: values(USER_ROLES), example: USER_ROLES.USER },
      phone: { type: 'string', example: '975 575 017' },
      vehicleType: { type: 'string', enum: values(VEHICLE_TYPES) },
    },
  },
  MockProduct: {
    type: 'object',
    properties: {
      _id: objectId('bbc2daa1eb9decf3fed896c5'),
      title: { type: 'string', example: 'Silla Guapa de Hormigón' },
      description: { type: 'string' },
      code: { type: 'string', example: 'SKU-K3J9QW2Z' },
      price: { type: 'integer', example: 45200 },
      stock: { type: 'integer', example: 87 },
      category: { type: 'string', example: 'Deportes' },
      status: { type: 'string', enum: values(PRODUCT_STATUS), example: PRODUCT_STATUS.AVAILABLE },
    },
  },
  MockOrder: {
    type: 'object',
    properties: {
      _id: objectId('ac8ae7cec9e49dc7adf7d2d8'),
      user: objectId('4fcec4c71eeadeac6eee8c67', 'Id del cliente simulado'),
      items: { type: 'array', items: ref('OrderItem') },
      priority: { type: 'string', enum: values(ORDER_PRIORITY) },
      status: { type: 'string', enum: values(ORDER_STATUS) },
      shippingAddress: ref('Address'),
      notes: { type: 'string' },
      subtotal: { type: 'number' },
      shippingCost: { type: 'number' },
      total: { type: 'number' },
      createdAt: dateTime(),
    },
  },
  MockDelivery: {
    type: 'object',
    properties: {
      _id: objectId('ceb28327fab196ce76da63fa'),
      order: objectId('fcbdf847facedf9b8209c438', 'Id del pedido simulado'),
      courier: { ...objectId('6796de52a27dcc4f6eb1eac1', 'Id del repartidor (null si está pending)'), nullable: true },
      trackingCode: { type: 'string', example: 'SN-ZZ4SKFHFFX' },
      status: { type: 'string', enum: values(DELIVERY_STATUS) },
      address: ref('Address'),
      estimatedDeliveryDate: dateTime(),
      deliveredAt: { ...dateTime(), nullable: true },
      statusHistory: { type: 'array', items: ref('StatusHistoryEntry') },
      createdAt: dateTime(),
    },
  },
  MockDataset: {
    type: 'object',
    description: 'Set relacionado: order.user, items.product, delivery.order y delivery.courier apuntan a _id del mismo set',
    properties: {
      users: { type: 'array', items: ref('MockUser') },
      couriers: { type: 'array', items: ref('MockUser') },
      products: { type: 'array', items: ref('MockProduct') },
      orders: { type: 'array', items: ref('MockOrder') },
      deliveries: { type: 'array', items: ref('MockDelivery') },
    },
  },
  MockGenerateDataInput: {
    type: 'object',
    additionalProperties: false,
    description:
      'Cantidades a insertar (todas opcionales, enteras entre 0 y 100). Para generar pedidos hace falta al menos 1 usuario y 1 producto',
    properties: {
      users: mockQuantity('users', 5),
      couriers: mockQuantity('couriers', 2),
      products: mockQuantity('products', 8),
      orders: mockQuantity('orders', 12),
    },
  },
  MockSeedResult: {
    type: 'object',
    properties: {
      inserted: { type: 'integer', example: 10 },
      collection: { type: 'string', enum: values(MOCK_COLLECTIONS), example: MOCK_COLLECTIONS.USERS },
      relatedDeliveries: {
        type: 'integer',
        description: 'Solo cuando collection = orders: entregas creadas para esos pedidos',
        example: 8,
      },
    },
  },
  MockGenerateDataResult: {
    type: 'object',
    properties: {
      inserted: {
        type: 'object',
        properties: {
          users: { type: 'integer', example: 5 },
          couriers: { type: 'integer', example: 2 },
          products: { type: 'integer', example: 8 },
          orders: { type: 'integer', example: 12 },
          deliveries: { type: 'integer', example: 7 },
        },
      },
      defaultPassword: { type: 'string', example: MOCKS.DEFAULT_PASSWORD },
    },
  },

  // ─── Logger ────────────────────────────────────────────────────────────────
  LoggerTestResult: {
    type: 'object',
    properties: {
      environment: { type: 'string', example: 'development' },
      activeLevel: { type: 'string', enum: Object.keys(LOG_LEVELS), example: 'debug' },
      consoleEnabled: { type: 'boolean', example: true },
      logDir: { type: 'string', example: 'logs' },
      files: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'error-AAAA-MM-DD.log (solo niveles error y fatal)' },
          combined: { type: 'string', example: 'combined-AAAA-MM-DD.log (desde el nivel debug)' },
        },
      },
      levels: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: Object.keys(LOG_LEVELS), example: 'error' },
            priority: { type: 'integer', example: LOG_LEVELS.error },
            enabled: { type: 'boolean', example: true },
            writtenTo: {
              type: 'array',
              items: { type: 'string', enum: ['combined', 'error', 'console'] },
              example: ['combined', 'error', 'console'],
            },
          },
        },
      },
    },
  },
};
