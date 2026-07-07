import { Decimal } from "@prisma/client/runtime/wasm-compiler-edge";
import { prisma } from "../db/prisma";
import { InvoiceType } from "../generated/prisma";
import { CreateInvoiceInput } from "../controllers/invoice.controller";



export const createInvoice = async (data: CreateInvoiceInput, userId: number) => {
  // if (!data.items || data.items.length === 0) {
  //   throw new Error("Invoice must contain at least one item.");
  // }

  return prisma.$transaction(async (tx) => {
    // 1. Fetch all products at once to establish the source of truth
    const productIds = data.items.map(i => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } }
    });

    if (products.length !== data.items.length) {
      throw new Error("One or more products not found in the database.");
    }

    // 2. Calculate totals with strict price enforcement
    let grandTotal = new Decimal(0);
    
    const invoiceItems = data.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      let priceToUse: Decimal;
      const isSale = data.type === InvoiceType.SALE || data.type === InvoiceType.RETURN_PURCHASE;

      if (isSale) {
        // ENFORCE SERVER PRICING: Never trust the client for sales
        priceToUse = product.price;
      } else {
        // ALLOW CLIENT PRICING: Trust the client for purchases, fallback to DB cost if missing
        priceToUse = item.unitPrice !== undefined 
          ? new Decimal(item.unitPrice) 
          : product.price;
      }

      const lineTotal = priceToUse.mul(item.quantity);
      grandTotal = grandTotal.plus(lineTotal);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: priceToUse,
        lineTotal: lineTotal
      };
    });

    // 3. Create the Invoice header and items
    const invoice = await tx.invoice.create({
      data: {
        type: data.type,
        customerId: data.customerId || null,
        userId: userId,
        totalAmount: grandTotal, 
        paymentMethod: data.paymentMethod,
        items: {
          create: invoiceItems,
        },
      },
      include: { items: true },
    });

    // 4. Process Stock Inventory
    for (const item of data.items) {
      const product = products.find(p => p.id === item.productId)!;
      let stockChange = 0;

      if (data.type === InvoiceType.PURCHASE || data.type === InvoiceType.RETURN_SALE) {
        stockChange = item.quantity; 
      } else if (data.type === InvoiceType.SALE || data.type === InvoiceType.RETURN_PURCHASE) {
        stockChange = -item.quantity; 
        
        if (product.stockQuantity + stockChange < 0) {
          throw new Error(`Insufficient stock for product: ${product.name}. Current stock: ${product.stockQuantity}`);
        }
      } else {
        throw new Error("Invalid invoice type.");
      }

      // Update the inventory count. 
      // NOTE: You may also want to update the product.costPrice here to reflect the latest purchase price.
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
export const getInvoices = async (userId?: number) => {
  // If a userId is passed, we fetch only their invoices (e.g., for a cashier's history).
  // If omitted, we fetch all (e.g., for an admin dashboard).
  const whereClause = userId ? { userId } : {};

  return prisma.invoice.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            select: { name: true, sku: true } // Fetch product names for the receipt
          }
        }
      },
      user: {
        select: { fullName: true } // Know who made the sale
      },
      customer: {
        select: { fullName: true, phoneNumber: true }
      }
    },
    take: 100 // Prevent massive payload crashes. Implement real pagination later.
  });
};