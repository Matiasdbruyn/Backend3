import { PRODUCT_STATUS } from '../constants/index.js';
import { ProductModel } from '../models/product.model.js';
import { buildUpdate, escapeRegex, findPaginated } from './helpers/queryHelpers.js';

export class ProductRepository {
  constructor(model = ProductModel) {
    this.model = model;
  }

  findAll({ status, category, minPrice, maxPrice } = {}, { page, limit }) {
    const filter = {};
    if (status) filter.status = status;
    // Búsqueda de categoría sin distinguir mayúsculas/minúsculas
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }
    return findPaginated(this.model, filter, { page, limit });
  }

  findById(id) {
    return this.model.findById(id).lean();
  }

  findByIds(ids) {
    return this.model.find({ _id: { $in: ids } }).lean();
  }

  async existsByCode(code, { excludeId } = {}) {
    const filter = { code: code.toUpperCase() };
    if (excludeId) filter._id = { $ne: excludeId };
    return Boolean(await this.model.exists(filter));
  }

  async create(data) {
    const created = await this.model.create(data);
    return created.toObject();
  }

  updateById(id, changes) {
    return this.model
      .findByIdAndUpdate(id, buildUpdate(changes), { returnDocument: 'after', runValidators: true })
      .lean();
  }

  deleteById(id) {
    return this.model.findByIdAndDelete(id).lean();
  }

  /**
   * Descuenta stock de forma atómica: solo actualiza si hay unidades
   * suficientes. Devuelve null si no alcanzó el stock.
   */
  decrementStock(id, quantity) {
    return this.model
      .findOneAndUpdate(
        { _id: id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { returnDocument: 'after' },
      )
      .lean();
  }

  incrementStock(id, quantity) {
    return this.model
      .findByIdAndUpdate(id, { $inc: { stock: quantity } }, { returnDocument: 'after' })
      .lean();
  }

  // ─── Usados por el módulo de mocks ─────────────────────────────────────────

  async insertMany(products) {
    const inserted = await this.model.insertMany(products, { ordered: true });
    return inserted.map((doc) => doc._id);
  }

  findRandomAvailable(size) {
    return this.model.aggregate([
      { $match: { status: PRODUCT_STATUS.AVAILABLE, stock: { $gt: 0 } } },
      { $sample: { size } },
    ]);
  }

  deleteManyByIds(ids) {
    return this.model.deleteMany({ _id: { $in: ids } });
  }
}

export const productRepository = new ProductRepository();
