// src/services/product.service.ts

import { productRepository } from "../repositories/product.repository";

export const createProduct = async (data: any) => {
  if (data.price < 0) {
    throw new Error("Price cannot be negative");
  }

  return productRepository.create(data);
};

export const getProducts = async () => {
  return productRepository.findAll();
};

export const getProductById = async (id: number) => {
  const product = await productRepository.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

export const updateProduct = async (
  id: number,
  data: any
) => {
  const existing = await productRepository.findById(id);

  if (!existing) {
    throw new Error("Product not found");
  }

  if (data.price && data.price < 0) {
    throw new Error("Price cannot be negative");
  }

  return productRepository.update(id, data);
};

export const deleteProduct = async (id: number) => {
  const existing = await productRepository.findById(id);

  if (!existing) {
    throw new Error("Product not found");
  }

  return productRepository.delete(id);
};