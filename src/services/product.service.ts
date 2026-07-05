import { productRepository } from "../repositories/product.repository";
import { prisma } from "../db/prisma";

export const createProduct = async (data: any) => {
  if (data.price !== undefined && data.price < 0) {
    throw new Error("Price cannot be negative");
  }

  // Ensure stock is 0 on creation. Initial stock comes from a Purchase Invoice.
  const safeData = { ...data, stockQuantity: 0 };
  
  return productRepository.create(safeData);
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

export const updateProduct = async (id: number, data: any) => {
  const existing = await productRepository.findById(id);

  if (!existing) {
    throw new Error("Product not found");
  }

  if (data.price !== undefined && data.price < 0) {
    throw new Error("Price cannot be negative");
  }

  // PREVENT MANUAL STOCK TAMPERING
  const { stockQuantity, ...safeDataToUpdate } = data;

  if (stockQuantity !== undefined) {
      console.warn(`Attempted manual stock update on product ${id}. Ignored.`);
  }

  return productRepository.update(id, safeDataToUpdate);
};

export const deleteProduct = async (id: number) => {
  const existing = await productRepository.findById(id);

  if (!existing) {
    throw new Error("Product not found");
  }

  // Check if product is used in any invoices before deleting
  const invoiceCount = await prisma.invoiceItem.count({
    where: { productId: id }
  });

  if (invoiceCount > 0) {
    throw new Error("Cannot delete product: It is associated with existing invoices. Deactivate it instead.");
  }

  return productRepository.delete(id);
};