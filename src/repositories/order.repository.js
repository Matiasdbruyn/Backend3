import { OrderModel } from '../models/order.model.js';
import { buildUpdate, findPaginated } from './helpers/queryHelpers.js';

// Del cliente solo exponemos los datos necesarios para identificar el pedido.
const POPULATE_USER = { path: 'user', select: 'firstName lastName email' };

export class OrderRepository {
  constructor(model = OrderModel) {
    this.model = model;
  }

  findAll({ status, priority, userId } = {}, { page, limit }) {
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (userId) filter.user = userId;
    return findPaginated(this.model, filter, { page, limit, populate: [POPULATE_USER] });
  }

  findById(id) {
    return this.model.findById(id).populate(POPULATE_USER).lean();
  }

  async create(data) {
    const created = await this.model.create(data);
    return this.findById(created._id);
  }

  updateById(id, changes) {
    return this.model
      .findByIdAndUpdate(id, buildUpdate(changes), { returnDocument: 'after', runValidators: true })
      .populate(POPULATE_USER)
      .lean();
  }

  /**
   * Cambia el estado solo si el pedido sigue en el estado esperado
   * (evita pisar un cambio concurrente). Devuelve null si no se actualizó.
   */
  updateStatus(id, { from, to }) {
    return this.model
      .findOneAndUpdate({ _id: id, status: from }, { $set: { status: to } }, { returnDocument: 'after' })
      .populate(POPULATE_USER)
      .lean();
  }

  deleteById(id) {
    return this.model.findByIdAndDelete(id).lean();
  }

  // ─── Usados por el módulo de mocks ─────────────────────────────────────────

  async insertMany(orders) {
    const inserted = await this.model.insertMany(orders, { ordered: true });
    return inserted.map((doc) => doc._id);
  }

  deleteManyByIds(ids) {
    return this.model.deleteMany({ _id: { $in: ids } });
  }
}

export const orderRepository = new OrderRepository();
