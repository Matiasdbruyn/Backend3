import { HTTP_STATUS } from '../constants/index.js';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/response.js';

// Los controllers solo traducen HTTP ↔ service. Si el service lanza un error,
// Express 5 lo deriva automáticamente al middleware global de errores.

export const getUsers = async (req, res) => {
  const { docs, pagination } = await userService.getUsers(req.query);
  sendSuccess(res, { payload: docs, pagination });
};

export const getUserById = async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  sendSuccess(res, { payload: user });
};

export const createUser = async (req, res) => {
  const user = await userService.createUser(req.body);
  sendSuccess(res, { statusCode: HTTP_STATUS.CREATED, message: 'Usuario creado', payload: user });
};

export const updateUser = async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  sendSuccess(res, { message: 'Usuario actualizado', payload: user });
};

export const deleteUser = async (req, res) => {
  const user = await userService.deleteUser(req.params.id);
  sendSuccess(res, { message: 'Usuario eliminado', payload: user });
};
