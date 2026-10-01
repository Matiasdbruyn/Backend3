import { HTTP_STATUS } from '../constants/index.js';
import { orderService } from '../services/order.service.js';
import { sendSuccess } from '../utils/response.js';

export const getOrders = async (req, res) => {
  const { docs, pagination } = await orderService.getOrders(req.query);
  sendSuccess(res, { payload: docs, pagination });
};

export const getOrderById = async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  sendSuccess(res, { payload: order });
};

export const createOrder = async (req, res) => {
  const order = await orderService.createOrder(req.body);
  sendSuccess(res, { statusCode: HTTP_STATUS.CREATED, message: 'Pedido creado', payload: order });
};

export const updateOrder = async (req, res) => {
  const order = await orderService.updateOrder(req.params.id, req.body);
  sendSuccess(res, { message: 'Pedido actualizado', payload: order });
};

export const updateOrderStatus = async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.body);
  sendSuccess(res, { message: `Estado del pedido actualizado a "${order.status}"`, payload: order });
};

export const deleteOrder = async (req, res) => {
  const order = await orderService.deleteOrder(req.params.id);
  sendSuccess(res, { message: 'Pedido eliminado', payload: order });
};
