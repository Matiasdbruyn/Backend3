import bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS, USER_ROLES } from '../constants/index.js';
import { EmailAlreadyExistsError, UserNotFoundError, ValidationError } from '../errors/index.js';
import { userRepository } from '../repositories/user.repository.js';
import { assertValidId } from '../utils/ids.js';
import { logger } from '../utils/logger.js';
import { buildPagination } from '../utils/pagination.js';
import { validate } from '../validators/common.validator.js';
import {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
} from '../validators/user.validator.js';

export const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);

export class UserService {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async getUsers(query) {
    const { page, limit, role } = validate(userQuerySchema, query);
    const { docs, total } = await this.userRepository.findAll({ role }, { page, limit });
    return { docs, pagination: buildPagination({ total, page, limit }) };
  }

  async getUserById(id) {
    assertValidId(id);
    const user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundError({ id });
    return user;
  }

  async createUser(data) {
    const payload = validate(createUserSchema, data);
    this.#ensureVehicleMatchesRole(payload.role, payload.vehicleType);

    if (await this.userRepository.existsByEmail(payload.email)) {
      throw new EmailAlreadyExistsError(payload.email);
    }

    payload.password = await hashPassword(payload.password);
    const user = await this.userRepository.create(payload);
    logger.info(`Usuario ${user._id} creado (${user.email}, rol ${user.role})`);
    return user;
  }

  async updateUser(id, data) {
    const current = await this.getUserById(id);
    const changes = validate(updateUserSchema, data);

    // El vehículo se valida contra el rol final (el nuevo o el que ya tenía)
    const finalRole = changes.role ?? current.role;
    const isCourier = finalRole === USER_ROLES.COURIER;
    const finalVehicle = changes.vehicleType ?? (isCourier ? current.vehicleType : undefined);
    this.#ensureVehicleMatchesRole(finalRole, finalVehicle);
    // Si deja de ser repartidor se elimina el vehículo que tenía
    if (!isCourier && current.vehicleType) changes.vehicleType = null;

    if (changes.email && (await this.userRepository.existsByEmail(changes.email, { excludeId: id }))) {
      throw new EmailAlreadyExistsError(changes.email);
    }
    if (changes.password) changes.password = await hashPassword(changes.password);

    const updated = await this.userRepository.updateById(id, changes);
    logger.info(`Usuario ${id} actualizado (${Object.keys(changes).join(', ')})`);
    return updated;
  }

  async deleteUser(id) {
    assertValidId(id);
    const deleted = await this.userRepository.deleteById(id);
    if (!deleted) throw new UserNotFoundError({ id });
    logger.info(`Usuario ${id} eliminado (${deleted.email})`);
    return deleted;
  }

  // Regla de negocio: todo repartidor tiene vehículo y solo los repartidores lo tienen.
  #ensureVehicleMatchesRole(role, vehicleType) {
    if (role === USER_ROLES.COURIER && !vehicleType) {
      throw new ValidationError([
        { field: 'vehicleType', message: 'Los repartidores (courier) deben indicar el tipo de vehículo' },
      ]);
    }
    if (role !== USER_ROLES.COURIER && vehicleType) {
      throw new ValidationError([
        { field: 'vehicleType', message: 'Solo los repartidores (courier) pueden tener vehículo' },
      ]);
    }
  }
}

export const userService = new UserService({ userRepository });
