import * as productRepository from "../repositories/product.repository";

export const createProduct = async (
  data: any
) => {
  return productRepository.create(data);
};

export const getProducts = async () => {
  return productRepository.findAll();
};

export const getProduct = async (
  id: number
) => {
  return productRepository.findById(id);
};

export const updateProduct = async (
  id: number,
  data: any
) => {
  return productRepository.update(id, data);
};

export const deleteProduct = async (
  id: number
) => {
  return productRepository.deleteById(id);
};