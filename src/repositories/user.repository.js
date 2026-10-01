import { UserModel } from '../models/user.model.js';
import { buildUpdate, findPaginated } from './helpers/queryHelpers.js';

// Proyección por defecto: la contraseña nunca sale del repository.
const PUBLIC_PROJECTION = '-password';

export class UserRepository {
  constructor(model = UserModel) {
    this.model = model;
  }

  findAll({ role } = {}, { page, limit }) {
    const filter = {};
    if (role) filter.role = role;
    return findPaginated(this.model, filter, { page, limit, projection: PUBLIC_PROJECTION });
  }

  findById(id) {
    return this.model.findById(id, PUBLIC_PROJECTION).lean();
  }

  async existsByEmail(email, { excludeId } = {}) {
    const filter = { email: email.toLowerCase() };
    if (excludeId) filter._id = { $ne: excludeId };
    return Boolean(await this.model.exists(filter));
  }

  async create(data) {
    const created = await this.model.create(data);
    const { password, ...user } = created.toObject();
    return user;
  }

  updateById(id, changes) {
    return this.model
      .findByIdAndUpdate(id, buildUpdate(changes), {
        returnDocument: 'after',
        runValidators: true,
        projection: PUBLIC_PROJECTION,
      })
      .lean();
  }

  deleteById(id) {
    return this.model.findByIdAndDelete(id, { projection: PUBLIC_PROJECTION }).lean();
  }

  // ─── Usados por el módulo de mocks ─────────────────────────────────────────

  async insertMany(users) {
    const inserted = await this.model.insertMany(users, { ordered: true });
    return inserted.map((doc) => doc._id);
  }

  // Muestra aleatoria de usuarios de un rol (solo datos públicos mínimos).
  findRandomByRole(role, size) {
    return this.model.aggregate([
      { $match: { role } },
      { $sample: { size } },
      { $project: { firstName: 1, lastName: 1, role: 1 } },
    ]);
  }

  deleteManyByIds(ids) {
    return this.model.deleteMany({ _id: { $in: ids } });
  }
}

export const userRepository = new UserRepository();
