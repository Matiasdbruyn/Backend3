import { MOCK_COLLECTIONS, MOCKS, USER_ROLES } from '../constants/index.js';
import { MockDependencyError, MockSeedError } from '../errors/index.js';
import {
  buildMockDataset,
  buildOrdersWithDeliveries,
  createMany,
  createMockProduct,
  createMockUser,
} from '../mocks/generators.js';
import { deliveryRepository } from '../repositories/delivery.repository.js';
import { orderRepository } from '../repositories/order.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { validate } from '../validators/common.validator.js';
import {
  mockUsersQuerySchema,
  parseDatasetCounts,
  parseMockCollection,
  parseMockQuantity,
} from '../validators/mock.validator.js';
import { hashPassword } from './user.service.js';

// Cuántos clientes/productos/repartidores existentes se usan como base para generar pedidos
const SEED_SAMPLE_SIZE = 50;

export class MocksService {
  constructor({ userRepository, productRepository, orderRepository, deliveryRepository }) {
    this.userRepository = userRepository;
    this.productRepository = productRepository;
    this.orderRepository = orderRepository;
    this.deliveryRepository = deliveryRepository;
  }

  // ─── Datos simulados SIN guardar en la base ────────────────────────────────

  generateUsers({ qty, role }) {
    const quantity = parseMockQuantity(qty);
    const filters = validate(mockUsersQuerySchema, { role });
    return createMany(quantity, () => createMockUser({ role: filters.role }));
  }

  generateCouriers({ qty }) {
    return createMany(parseMockQuantity(qty), () => createMockUser({ role: USER_ROLES.COURIER }));
  }

  generateProducts({ qty }) {
    return createMany(parseMockQuantity(qty), () => createMockProduct());
  }

  generateOrders({ qty }) {
    const quantity = parseMockQuantity(qty);
    const { orders } = buildMockDataset({
      users: Math.ceil(quantity / 2),
      couriers: Math.ceil(quantity / 4),
      products: Math.max(3, Math.ceil(quantity / 2)),
      orders: quantity,
    });
    return orders;
  }

  generateDeliveries({ qty }) {
    const quantity = parseMockQuantity(qty);
    const { deliveries } = buildOrdersWithDeliveries({
      customers: createMany(Math.ceil(quantity / 2), () => createMockUser({ role: USER_ROLES.USER })),
      products: createMany(Math.max(3, Math.ceil(quantity / 2)), () => createMockProduct({ forceStock: true })),
      couriers: createMany(Math.ceil(quantity / 4), () => createMockUser({ role: USER_ROLES.COURIER })),
      qty: quantity,
      onlyWithDelivery: true,
    });
    return deliveries;
  }

  // Set completo y relacionado (los _id coinciden entre entidades)
  generateDataset(query) {
    return buildMockDataset(parseDatasetCounts(query));
  }

  // ─── Inserción controlada en MongoDB ───────────────────────────────────────

  /** Inserta `qty` registros de prueba en una colección (por defecto, users). */
  async seed({ collection: rawCollection, qty }) {
    const collection = parseMockCollection(rawCollection);
    const quantity = parseMockQuantity(qty);

    const dataset = await this.#buildSeedDataset(collection, quantity);
    const inserted = await this.#persist(dataset);

    const result = { inserted: inserted[collection], collection };
    if (collection === MOCK_COLLECTIONS.ORDERS) result.relatedDeliveries = inserted.deliveries;
    return result;
  }

  /** Genera e inserta un set completo: clientes, repartidores, productos, pedidos y entregas. */
  async generateData(body) {
    const counts = parseDatasetCounts(body);
    const inserted = await this.#persist(buildMockDataset(counts));
    return { inserted, defaultPassword: MOCKS.DEFAULT_PASSWORD };
  }

  async #buildSeedDataset(collection, qty) {
    switch (collection) {
      case MOCK_COLLECTIONS.USERS:
        return { users: createMany(qty, () => createMockUser()) };
      case MOCK_COLLECTIONS.COURIERS:
        return { couriers: createMany(qty, () => createMockUser({ role: USER_ROLES.COURIER })) };
      case MOCK_COLLECTIONS.PRODUCTS:
        return { products: createMany(qty, () => createMockProduct()) };
      case MOCK_COLLECTIONS.ORDERS:
        return this.#buildOrdersFromDatabase(qty);
      default:
        return {};
    }
  }

  // Los pedidos se relacionan con clientes y productos que YA existen en la base.
  async #buildOrdersFromDatabase(qty) {
    const [customers, products, couriers] = await Promise.all([
      this.userRepository.findRandomByRole(USER_ROLES.USER, SEED_SAMPLE_SIZE),
      this.productRepository.findRandomAvailable(SEED_SAMPLE_SIZE),
      this.userRepository.findRandomByRole(USER_ROLES.COURIER, SEED_SAMPLE_SIZE),
    ]);

    if (customers.length === 0 || products.length === 0) {
      throw new MockDependencyError(
        'Para generar pedidos primero tiene que haber clientes (role user) y productos con stock en la base',
        {
          customersFound: customers.length,
          availableProductsFound: products.length,
          hint: 'Usá POST /api/mocks/seed?collection=users y POST /api/mocks/seed?collection=products',
        },
      );
    }
    return buildOrdersWithDeliveries({ customers, products, couriers, qty });
  }

  /**
   * Inserta el set de datos respetando el orden de las relaciones.
   * Si algo falla, borra lo que se alcanzó a insertar (para no dejar datos
   * a medias) y responde con un MockSeedError.
   */
  async #persist({ users = [], couriers = [], products = [], orders = [], deliveries = [] }) {
    const password = await hashPassword(MOCKS.DEFAULT_PASSWORD);
    const steps = [
      ['users', this.userRepository, users.map((user) => ({ ...user, password }))],
      ['couriers', this.userRepository, couriers.map((user) => ({ ...user, password }))],
      ['products', this.productRepository, products],
      ['orders', this.orderRepository, orders],
      ['deliveries', this.deliveryRepository, deliveries],
    ];

    const inserted = {};
    const attempted = [];
    let currentStep;
    try {
      for (const [name, repository, docs] of steps) {
        currentStep = name;
        inserted[name] = 0;
        if (docs.length === 0) continue;
        attempted.push({ repository, ids: docs.map((doc) => doc._id) });
        inserted[name] = (await repository.insertMany(docs)).length;
      }
      return inserted;
    } catch (error) {
      const rolledBack = await this.#rollback(attempted);
      throw new MockSeedError(error, { failedCollection: currentStep, rolledBack });
    }
  }

  async #rollback(attempted) {
    try {
      for (const { repository, ids } of attempted.reverse()) {
        await repository.deleteManyByIds(ids);
      }
      return true;
    } catch (error) {
      console.error('[mocks] No se pudo revertir la carga parcial de datos de prueba:', error);
      return false;
    }
  }
}

export const mocksService = new MocksService({
  userRepository,
  productRepository,
  orderRepository,
  deliveryRepository,
});
