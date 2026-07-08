import { prisma } from "../db/prisma";
import { CreateProductDTO, UpdateProductDTO } from "../controllers/product.controller";
import { AppError } from "../middlewares/errorHandler";

export const createProduct = async (data: CreateProductDTO) => {
  const [existingCategory, existingSku, existingBarcode] = await Promise.all([
    prisma.category.findUnique({ where: { id: data.categoryId } }),
    prisma.product.findUnique({ where: { sku: data.sku } }),
    data.barcode 
      ? prisma.product.findUnique({ where: { barcode: data.barcode } }) 
      : null,
  ]);

  if (!existingCategory) throw new AppError(404, "Category_not_found");
  if (existingSku) throw new AppError(409, "Product_with_this_SKU_already_exists");
  if (existingBarcode) throw new AppError(409, "Product_with_this_barcode_already_exists");

  return prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku,
      barcode: data.barcode ?? null,
      price: data.price,
      stockQuantity: 0,
      categoryId: data.categoryId, // Cleaner if using foreign key IDs directly
    },
  });
};


export const getProducts = async () => {
    return prisma.product.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });};

export const getProductById = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!product) {
    throw new AppError(404, "Product_not_found");
  }

  return product;
};

export const updateProduct = async (id: number, data: UpdateProductDTO) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Product_not_found");

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
  // Use a transaction to ensure atomic check and delete
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError(404, "Product_not_found");
    }

    const hasInvoices = await tx.invoiceItem.findFirst({
      where: { productId: id },
      select: { id: true } // Optimization: Only fetch ID, not the whole object
    });

    if (hasInvoices) {
      throw new AppError(409, "Cannot_delete_product_associated_with_invoices");
    }

    return tx.product.delete({ where: { id } });
  });
};