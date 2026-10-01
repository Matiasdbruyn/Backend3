import { DeliveryModel } from '../models/delivery.model.js';
import { buildUpdate, findPaginated } from './helpers/queryHelpers.js';

const POPULATE_ORDER = { path: 'order', select: 'status priority total user' };
const POPULATE_COURIER = { path: 'courier', select: 'firstName lastName phone vehicleType' };

// En los listados no mandamos el historial completo (respuestas más livianas).
const LIST_PROJECTION = '-statusHistory';

// Lo que ve cualquier persona con el código de seguimiento: sin datos sensibles.
const TRACKING_PROJECTION =
  'trackingCode status statusHistory estimatedDeliveryDate deliveredAt address.city courier';
const TRACKING_POPULATE_COURIER = { path: 'courier', select: 'firstName vehicleType -_id' };

export class DeliveryRepository {
  constructor(model = DeliveryModel) {
    this.model = model;
  }

  findAll({ status, courierId } = {}, { page, limit }) {
    const filter = {};
    if (status) filter.status = status;
    if (courierId) filter.courier = courierId;
    return findPaginated(this.model, filter, {
      page,
      limit,
      projection: LIST_PROJECTION,
      populate: [POPULATE_ORDER, POPULATE_COURIER],
    });
  }

  findById(id) {
    return this.model.findById(id).populate(POPULATE_ORDER).populate(POPULATE_COURIER).lean();
  }

  findByOrderId(orderId) {
    return this.model.findOne({ order: orderId }).lean();
  }

  findByTrackingCode(trackingCode) {
    return this.model
      .findOne({ trackingCode }, TRACKING_PROJECTION)
      .populate(TRACKING_POPULATE_COURIER)
      .lean();
  }

  async create(data) {
    const created = await this.model.create(data);
    return this.findById(created._id);
  }

  /**
   * Actualiza campos y, opcionalmente, agrega una entrada al historial de
   * estados en la misma operación.
   */
  updateById(id, changes, historyEntry) {
    const update = buildUpdate(changes);
    if (historyEntry) update.$push = { statusHistory: historyEntry };
    return this.model
      .findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true })
      .populate(POPULATE_ORDER)
      .populate(POPULATE_COURIER)
      .lean();
  }

  deleteByOrderId(orderId) {
    return this.model.deleteOne({ order: orderId });
  }

  // ─── Usados por el módulo de mocks ─────────────────────────────────────────

  async insertMany(deliveries) {
    const inserted = await this.model.insertMany(deliveries, { ordered: true });
    return inserted.map((doc) => doc._id);
  }

  deleteManyByIds(ids) {
    return this.model.deleteMany({ _id: { $in: ids } });
  }
}

export const deliveryRepository = new DeliveryRepository();
