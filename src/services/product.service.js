import { PRODUCT_STATUS } from '../constants/index.js';
import {
  InsufficientStockError,
  ProductCodeAlreadyExistsError,
  ProductNotFoundError,
} from '../errors/index.js';
import { productRepository } from '../repositories/product.repository.js';
import { assertValidId } from '../utils/ids.js';
import { buildPagination } from '../utils/pagination.js';
import {
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
} from '../validators/product.validator.js';
import { validate } from '../validators/common.validator.js';

// Regla de negocio: el estado de un producto depende de su stock.
export const resolveProductStatus = (stock) =>
  stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK;

export class ProductService {
  constructor({ productRepository }) {
    this.productRepository = productRepository;
  }

  async getProducts(query) {
    const { page, limit, includeOutOfStock, ...filters } = validate(productQuerySchema, query);

    // Por defecto el catálogo solo muestra productos con stock, salvo que se
    // pida un estado puntual o se indique includeOutOfStock=true.
    if (!filters.status && !includeOutOfStock) filters.status = PRODUCT_STATUS.AVAILABLE;

    const { docs, total } = await this.productRepository.findAll(filters, { page, limit });
    return { docs, pagination: buildPagination({ total, page, limit }) };
  }

  async getProductById(id) {
    assertValidId(id);
    const product = await this.productRepository.findById(id);
    if (!product) throw new ProductNotFoundError({ id });
    return product;
  }

  async createProduct(data) {
    const payload = validate(createProductSchema, data);
    if (await this.productRepository.existsByCode(payload.code)) {
      throw new ProductCodeAlreadyExistsError(payload.code);
    }
    return this.productRepository.create({
      ...payload,
      status: resolveProductStatus(payload.stock),
    });
  }

  async updateProduct(id, data) {
    await this.getProductById(id);
    const changes = validate(updateProductSchema, data);

    if (changes.code && (await this.productRepository.existsByCode(changes.code, { excludeId: id }))) {
      throw new ProductCodeAlreadyExistsError(changes.code);
    }
    if (changes.stock !== undefined) changes.status = resolveProductStatus(changes.stock);

    return this.productRepository.updateById(id, changes);
  }

  async deleteProduct(id) {
    assertValidId(id);
    const deleted = await this.productRepository.deleteById(id);
    if (!deleted) throw new ProductNotFoundError({ id });
    return deleted;
  }

  // ─── Stock (usado por el service de pedidos) ───────────────────────────────

  /**
   * Descuenta el stock de cada ítem. Si algún producto no alcanza, devuelve
   * lo ya descontado y lanza InsufficientStockError (todo o nada).
   */
  async reserveStock(items) {
    const reserved = [];
    try {
      for (const { productId, quantity } of items) {
        const updated = await this.productRepository.decrementStock(productId, quantity);
        if (!updated) {
          throw new InsufficientStockError({ productId, requested: quantity });
        }
        reserved.push({ productId, quantity });
        await this.#syncStatus(updated);
      }
    } catch (error) {
      await this.releaseStock(reserved);
      throw error;
    }
  }

  async releaseStock(items) {
    for (const { productId, quantity } of items) {
      const updated = await this.productRepository.incrementStock(productId, quantity);
      if (updated) await this.#syncStatus(updated);
    }
  }

  async #syncStatus(product) {
    const status = resolveProductStatus(product.stock);
    if (status !== product.status) {
      await this.productRepository.updateById(product._id, { status });
    }
  }
}

export const productService = new ProductService({ productRepository });
