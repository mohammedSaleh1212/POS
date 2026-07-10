import { Decimal } from "@prisma/client/runtime/wasm-compiler-edge";
import { prisma } from "../db/prisma";
import { InvoiceType } from "../generated/prisma";
import { CreateInvoiceInput } from "../controllers/invoice.controller";
import { AppError } from "../middlewares/errorHandler";



export const createInvoice = async (
  data: CreateInvoiceInput,
  userId: number
) => {
  return prisma.$transaction(async (tx) => {

    const customerInvoiceTypes = new Set<InvoiceType>([
      InvoiceType.SALE,
      InvoiceType.RETURN_SALE,
    ]);

    const supplierInvoiceTypes = new Set<InvoiceType>([
      InvoiceType.PURCHASE,
      InvoiceType.RETURN_PURCHASE,
    ]);

    const outgoingInvoiceTypes = new Set<InvoiceType>([
      InvoiceType.SALE,
      InvoiceType.RETURN_PURCHASE,
    ]);


    // =====================================================
    // 1. Validate Contact
    // =====================================================

    let contact = null;

    if (data.contactId) {
      contact = await tx.contact.findUnique({
        where: {
          id: data.contactId,
        },
      });

      if (!contact) {
        throw new AppError(
          404,
          "Contact_not_found"
        );
      }


      if (
        customerInvoiceTypes.has(data.type) &&
        !contact.isCustomer
      ) {
        throw new AppError(
          400,
          "Selected_contact_is_not_a_customer"
        );
      }


      if (
        supplierInvoiceTypes.has(data.type) &&
        !contact.isSupplier
      ) {
        throw new AppError(
          400,
          "Selected_contact_is_not_a_supplier"
        );
      }
    }


    if (
      supplierInvoiceTypes.has(data.type) &&
      !data.contactId
    ) {
      throw new AppError(
        400,
        "Supplier_is_required"
      );
    }



    // =====================================================
    // 2. Load Products
    // =====================================================

    const productIds = data.items.map(
      item => item.productId
    );


    const products = await tx.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });


    if (products.length !== productIds.length) {
      throw new AppError(
        404,
        "One_or_more_products_not_found"
      );
    }



    // =====================================================
    // 3. Build Invoice Items
    // =====================================================

    let grandTotal = new Decimal(0);


    const invoiceItems = data.items.map(item => {

      const product = products.find(
        p => p.id === item.productId
      );


      if (!product) {
        throw new AppError(
          404,
          "Product_not_found"
        );
      }


      const unitPrice = outgoingInvoiceTypes.has(data.type)
        ? product.price
        : item.unitPrice !== undefined
          ? new Decimal(item.unitPrice)
          : product.price;


      const lineTotal = unitPrice.mul(
        item.quantity
      );


      grandTotal = grandTotal.plus(lineTotal);


      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });



    // =====================================================
    // 4. Validate Stock
    // =====================================================

    if (outgoingInvoiceTypes.has(data.type)) {

      for (const item of data.items) {

        const product = products.find(
          p => p.id === item.productId
        )!;


        if (product.stockQuantity < item.quantity) {

          throw new AppError(
            400,
            "Insufficient_stock",
            {
              productId: product.id,
              productName: product.name,
              availableStock: product.stockQuantity,
              requestedQuantity: item.quantity,
            }
          );
        }
      }
    }



    // =====================================================
    // 5. Create Invoice
    // =====================================================

    const invoice = await tx.invoice.create({

      data: {
        type: data.type,
        contactId: data.contactId ?? null,
        userId,
        totalAmount: grandTotal,
        paymentMethod: data.paymentMethod,

        items: {
          create: invoiceItems,
        },
      },

      include: {
        items: true,
      },

    });



    // =====================================================
    // 6. Update Inventory
    // =====================================================

    for (const item of data.items) {

      const stockChange = outgoingInvoiceTypes.has(data.type)
        ? -item.quantity
        : item.quantity;


      await tx.product.update({

        where: {
          id: item.productId,
        },

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
      contact: {
        select: { fullName: true, phoneNumber: true }
      }
    },
    take: 100 // Prevent massive payload crashes. Implement real pagination later.
  });
};