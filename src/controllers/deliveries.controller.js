import { HTTP_STATUS } from '../constants/index.js';
import { deliveryService } from '../services/delivery.service.js';
import { sendSuccess } from '../utils/response.js';

export const getDeliveries = async (req, res) => {
  const { docs, pagination } = await deliveryService.getDeliveries(req.query);
  sendSuccess(res, { payload: docs, pagination });
};

export const getDeliveryById = async (req, res) => {
  const delivery = await deliveryService.getDeliveryById(req.params.id);
  sendSuccess(res, { payload: delivery });
};

export const trackDelivery = async (req, res) => {
  const delivery = await deliveryService.getDeliveryByTrackingCode(req.params.trackingCode);
  sendSuccess(res, { payload: delivery });
};

export const createDelivery = async (req, res) => {
  const delivery = await deliveryService.createDelivery(req.body);
  sendSuccess(res, { statusCode: HTTP_STATUS.CREATED, message: 'Entrega creada', payload: delivery });
};

export const assignCourier = async (req, res) => {
  const delivery = await deliveryService.assignCourier(req.params.id, req.body);
  sendSuccess(res, { message: 'Repartidor asignado', payload: delivery });
};

export const updateDeliveryStatus = async (req, res) => {
  const delivery = await deliveryService.updateDeliveryStatus(req.params.id, req.body);
  sendSuccess(res, {
    message: `Estado de la entrega actualizado a "${delivery.status}"`,
    payload: delivery,
  });
};
