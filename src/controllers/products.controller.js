import { HTTP_STATUS } from '../constants/index.js';
import { productService } from '../services/product.service.js';
import { sendSuccess } from '../utils/response.js';

export const getProducts = async (req, res) => {
  const { docs, pagination } = await productService.getProducts(req.query);
  sendSuccess(res, { payload: docs, pagination });
};

export const getProductById = async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  sendSuccess(res, { payload: product });
};

export const createProduct = async (req, res) => {
  const product = await productService.createProduct(req.body);
  sendSuccess(res, { statusCode: HTTP_STATUS.CREATED, message: 'Producto creado', payload: product });
};

export const updateProduct = async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  sendSuccess(res, { message: 'Producto actualizado', payload: product });
};

export const deleteProduct = async (req, res) => {
  const product = await productService.deleteProduct(req.params.id);
  sendSuccess(res, { message: 'Producto eliminado', payload: product });
};
