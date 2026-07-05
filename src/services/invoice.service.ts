import { prisma } from "../db/prisma";
import { InvoiceType } from "../generated/prisma";

export const createInvoice = async (data: any, userId: number) => {
  if (!data.items || data.items.length === 0) {
    throw new Error("Invoice must contain at least one item.");
  }

  // Execute as an atomic transaction. If one query fails, everything rolls back.
  return prisma.$transaction(async (tx) => {
    // 1. Create the Invoice header and its items
    const invoice = await tx.invoice.create({
      data: {
        type: data.type,
        customerId: data.customerId || null,
        userId: userId,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        items: {
          create: data.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    // 2. Process Stock Logic
    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }

      let stockChange = 0;

      // Map InvoiceType to the correct mathematical operation
      if (data.type === InvoiceType.PURCHASE || data.type === InvoiceType.RETURN_SALE) {
        stockChange = item.quantity; // Add to stock
      } else if (data.type === InvoiceType.SALE || data.type === InvoiceType.RETURN_PURCHASE) {
        stockChange = -item.quantity; // Subtract from stock
        
        // Prevent negative inventory
        if (product.stockQuantity + stockChange < 0) {
          throw new Error(`Insufficient stock for product: ${product.name}. Current stock: ${product.stockQuantity}`);
        }
      } else {
        throw new Error("Invalid invoice type.");
      }

      // Apply the exact mathematical increment/decrement directly in the DB
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            increment: stockChange,
          },
        },
      });
    }

    return invoice;
  });
};