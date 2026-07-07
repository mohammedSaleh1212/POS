import { productRepository } from "../repositories/product.repository";
import { prisma } from "../db/prisma";
import { CreateProductDTO, UpdateProductDTO } from "../controllers/product.controller";

export const createProduct = async (data: CreateProductDTO) => {
  const existingCategory = await prisma.category.findUnique({
    where: { id: data.categoryId }
  });

  if (!existingCategory) {
    throw new Error("Category not found");
  }
  const existingSku = await prisma.product.findUnique({
    where: { sku: data.sku }
  });

  if (existingSku) {
    throw new Error("A product with this SKU already exists.");
  }
  if (data.barcode) {
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode: data.barcode }
    });
    
    if (existingBarcode) {
      throw new Error("Product with this barcode already exists.");
    }
  }
  return productRepository.create({
    name: data.name,
    sku: data.sku,
    barcode: data.barcode ?? null, 
    price: data.price,
    stockQuantity: 0,
    category: {
      connect: { id: data.categoryId }
    }
  });
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

export const updateProduct = async (id: number, data: UpdateProductDTO) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new Error("Product not found");

  // Filter out undefined keys
  const updatePayload = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  return prisma.product.update({
    where: { id },
    data: updatePayload // Now this is clean and valid
  });
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
}