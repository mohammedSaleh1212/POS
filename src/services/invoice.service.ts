import { Decimal } from "@prisma/client/runtime/wasm-compiler-edge";
import { prisma } from "../db/prisma";
import { InvoiceType, InvoiceStatus } from "../generated/prisma";
import { CreateInvoiceInput } from "../controllers/invoice.controller";
import { AppError } from "../middlewares/errorHandler";
import { getSettings } from "./settings.service";



export const createInvoice = async (data: CreateInvoiceInput, userId: number) => {
  return prisma.$transaction(async (tx) => {
    const customerInvoiceTypes = new Set<InvoiceType>(["SALE", "RETURN_SALE"]);
    const supplierInvoiceTypes = new Set<InvoiceType>(["PURCHASE", "RETURN_PURCHASE"]);
    const stockDecreaseInvoiceTypes = new Set<InvoiceType>(["SALE", "RETURN_PURCHASE"]);
    const returnInvoiceTypes = new Set<InvoiceType>(["RETURN_SALE", "RETURN_PURCHASE"]);

    // 1. جلب الإعدادات العامة
    const settings = await getSettings();

    // 2. التحقق من جهة الاتصال (Contact Validation)
    if (data.contactId) {
      const contact = await tx.contact.findUnique({ where: { id: data.contactId } });
      if (!contact) throw new AppError(404, "Contact_not_found");
      
      if (customerInvoiceTypes.has(data.type) && !contact.isCustomer) {
        throw new AppError(400, "Selected_contact_is_not_a_customer");
      }
      if (supplierInvoiceTypes.has(data.type) && !contact.isSupplier) {
        throw new AppError(400, "Selected_contact_is_not_a_supplier");
      }
    }

    if (supplierInvoiceTypes.has(data.type) && !data.contactId) {
      throw new AppError(400, "Supplier_is_required");
    }

    // 3. التحقق من الفاتورة الأصلية للمرتجعات
    let originalInvoice: any = null;
    if (returnInvoiceTypes.has(data.type)) {
      if (!data.originalInvoiceId) throw new AppError(400, "Original_invoice_is_required_for_return");

      originalInvoice = await tx.invoice.findUnique({
        where: { id: data.originalInvoiceId },
        include: { items: true },
      });

      if (!originalInvoice) throw new AppError(404, "Original_invoice_not_found");
      if (data.type === "RETURN_SALE" && originalInvoice.type !== "SALE") {
        throw new AppError(400, "Return_sale_must_reference_sale_invoice");
      }
      if (data.type === "RETURN_PURCHASE" && originalInvoice.type !== "PURCHASE") {
        throw new AppError(400, "Return_purchase_must_reference_purchase_invoice");
      }
    }

    // 4. تحميل المنتجات
    const productIds = data.items.map((item: any) => item.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) throw new AppError(404, "One_or_more_products_not_found");

    // 5. بناء بنود الفاتورة وحساب المجاميع
    let subtotalAmount = new Decimal(0);

    const invoiceItems = data.items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId)!;
      let unitPrice = new Decimal(0);
      let costPrice = new Decimal(product.costPrice);

      // منطق التسعير بناءً على نوع الفاتورة
      if (data.type === "SALE") {
        unitPrice = item.unitPrice !== undefined ? new Decimal(item.unitPrice) : new Decimal(product.sellingPrice);
      } else if (data.type === "PURCHASE") {
        unitPrice = item.unitPrice !== undefined ? new Decimal(item.unitPrice) : new Decimal(product.costPrice);
        costPrice = unitPrice; // في فاتورة الشراء، سعر الوحدة هو التكلفة الفعلية
      } else if (returnInvoiceTypes.has(data.type)) {
        // في المرتجعات، يجب أخذ السعر والتكلفة من الفاتورة الأصلية حصراً
        const originalItem = originalInvoice.items.find((i: any) => i.productId === item.productId);
        if (!originalItem) throw new AppError(400, `Product ${product.name} not found in original invoice`);
        if (item.quantity > originalItem.quantity) throw new AppError(400, `Return quantity exceeds original for ${product.name}`);
        
        unitPrice = new Decimal(originalItem.unitPrice);
        costPrice = new Decimal(originalItem.costPrice);
      }

      const lineTotal = unitPrice.mul(item.quantity);
      subtotalAmount = subtotalAmount.plus(lineTotal);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        costPrice, // حقل إلزامي لحساب الأرباح لاحقاً
        lineTotal,
      };
    });

    // 6. حساب الخصومات
    let discountAmount = new Decimal(0);
    if (data.discountType && data.discountValue !== undefined) {
      const discountValue = new Decimal(data.discountValue);
      if (data.discountType === "FIXED") {
        discountAmount = discountValue;
      } else if (data.discountType === "PERCENTAGE") {
        discountAmount = subtotalAmount.mul(discountValue).div(100);
      }
    }

    if (discountAmount.greaterThan(subtotalAmount)) {
      throw new AppError(400, "Discount_cannot_exceed_subtotal");
    }

    const subtotalAfterDiscount = subtotalAmount.minus(discountAmount);

    // 7. حساب الضرائب باستخدام الإعدادات
    let taxRate = new Decimal(0);
    let taxAmount = new Decimal(0);
    let totalAmount = subtotalAfterDiscount;

    if (settings.taxEnabled) {
      taxRate = new Decimal(settings.taxRate);
      
      if (settings.taxInclusive) {
        // إذا كان السعر شاملاً للضريبة: نستخرج قيمة الضريبة من الإجمالي لتسجيلها فقط
        // المعادلة: Tax = Total - (Total / (1 + Rate))
        const divisor = new Decimal(1).plus(taxRate.div(100));
        const subtotalWithoutTax = subtotalAfterDiscount.div(divisor);
        taxAmount = subtotalAfterDiscount.minus(subtotalWithoutTax);
        totalAmount = subtotalAfterDiscount; // الإجمالي يبقى كما هو لأنه شامل للضريبة
      } else {
        // إذا كان السعر غير شامل للضريبة: نضيف الضريبة للإجمالي
        taxAmount = subtotalAfterDiscount.mul(taxRate).div(100);
        totalAmount = subtotalAfterDiscount.plus(taxAmount);
      }
    }

    // 8. حساب حالة الدفع (Payment Status)
    const paidAmount = new Decimal(data.paidAmount ?? 0);
let status: InvoiceStatus = InvoiceStatus.UNPAID;    
    if (paidAmount.greaterThanOrEqualTo(totalAmount)) {
      status = InvoiceStatus.PAID;
    } else if (paidAmount.greaterThan(0)) {
      status = InvoiceStatus.PARTIAL;
    }

    // 9. التحقق من المخزون
    if (stockDecreaseInvoiceTypes.has(data.type)) {
      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId)!;
        if (product.stockQuantity < item.quantity) {
          throw new AppError(400, "Insufficient_stock", {
            productId: product.id,
            productName: product.name,
          });
        }
      }
    }

    // 10. إنشاء الفاتورة
    const invoice = await tx.invoice.create({
      data: {
        type: data.type,
        status: status,
        originalInvoiceId: data.originalInvoiceId ?? null,
        contactId: data.contactId ?? null,
        userId,
        subtotalAmount,
        discountType: data.discountType ?? null,
        discountValue: data.discountValue !== undefined ? new Decimal(data.discountValue) : null,
        discountAmount,
        taxRate,
        taxAmount,
        totalAmount,
        paidAmount,
        paymentMethod: data.paymentMethod,
        items: {
          create: invoiceItems,
        },
      },
      include: {
        items: true,
      },
    });

    // 11. تحديث المخزون وسعر التكلفة (للمشتريات)
    for (const item of invoiceItems) {
      const stockChange = stockDecreaseInvoiceTypes.has(data.type) ? -item.quantity : item.quantity;
      
      const updateData: any = {
        stockQuantity: { increment: stockChange },
      };

      // تحديث سعر تكلفة المنتج في حال كانت الفاتورة فاتورة شراء
      if (data.type === "PURCHASE") {
        updateData.costPrice = item.unitPrice; 
      }

      await tx.product.update({
        where: { id: item.productId },
        data: updateData,
      });
    }

    return invoice;
  });
};

// export const createInvoice = async (
//   data: CreateInvoiceInput,
//   userId: number
// ) => {
//   return prisma.$transaction(async (tx) => {

//     const customerInvoiceTypes = new Set<InvoiceType>([
//       InvoiceType.SALE,
//       InvoiceType.RETURN_SALE,
//     ]);

//     const supplierInvoiceTypes = new Set<InvoiceType>([
//       InvoiceType.PURCHASE,
//       InvoiceType.RETURN_PURCHASE,
//     ]);

//     const stockDecreaseInvoiceTypes = new Set<InvoiceType>([
//       InvoiceType.SALE,
//       InvoiceType.RETURN_PURCHASE,
//     ]);
//     const returnInvoiceTypes = new Set<InvoiceType>([
//       InvoiceType.RETURN_SALE,
//       InvoiceType.RETURN_PURCHASE,
//     ]);


//     // =====================================================
//     // 1. Validate Contact
//     // =====================================================

//     let contact = null;

//     if (data.contactId) {
//       contact = await tx.contact.findUnique({
//         where: {
//           id: data.contactId,
//         },
//       });

//       if (!contact) {
//         throw new AppError(
//           404,
//           "Contact_not_found"
//         );
//       }


//       if (
//         customerInvoiceTypes.has(data.type) &&
//         !contact.isCustomer
//       ) {
//         throw new AppError(
//           400,
//           "Selected_contact_is_not_a_customer"
//         );
//       }


//       if (
//         supplierInvoiceTypes.has(data.type) &&
//         !contact.isSupplier
//       ) {
//         throw new AppError(
//           400,
//           "Selected_contact_is_not_a_supplier"
//         );
//       }
//     }


//     if (
//       supplierInvoiceTypes.has(data.type) &&
//       !data.contactId
//     ) {
//       throw new AppError(
//         400,
//         "Supplier_is_required"
//       );
//     }
//     // =====================================================
//     // 2. Validate Original Invoice For Returns
//     // =====================================================

//     if (returnInvoiceTypes.has(data.type)) {

//       if (!data.originalInvoiceId) {
//         throw new AppError(
//           400,
//           "Original_invoice_is_required_for_return"
//         );
//       }


//       const originalInvoice = await tx.invoice.findUnique({
//         where: {
//           id: data.originalInvoiceId,
//         },
//         include: {
//           items: true,
//         },
//       });


//       if (!originalInvoice) {
//         throw new AppError(
//           404,
//           "Original_invoice_not_found"
//         );
//       }


//       if (data.type === InvoiceType.RETURN_SALE) {

//         if (originalInvoice.type !== InvoiceType.SALE) {
//           throw new AppError(
//             400,
//             "Return_sale_must_reference_sale_invoice"
//           );
//         }

//       }


//       if (data.type === InvoiceType.RETURN_PURCHASE) {

//         if (originalInvoice.type !== InvoiceType.PURCHASE) {
//           throw new AppError(
//             400,
//             "Return_purchase_must_reference_purchase_invoice"
//           );
//         }

//       }
//     }

//     // =====================================================
//     // 3. Load Products
//     // =====================================================

//     const productIds = data.items.map(
//       item => item.productId
//     );


//     const products = await tx.product.findMany({
//       where: {
//         id: {
//           in: productIds,
//         },
//       },
//     });


//     if (products.length !== productIds.length) {
//       throw new AppError(
//         404,
//         "One_or_more_products_not_found"
//       );
//     }



//     // =====================================================
//     // 3. Build Invoice Items
//     // =====================================================

//     let subtotalAmount = new Decimal(0);


//     const invoiceItems = data.items.map(item => {

//       const product = products.find(
//         p => p.id === item.productId
//       );


//       if (!product) {
//         throw new AppError(
//           404,
//           "Product_not_found"
//         );
//       }


//       const unitPrice = stockDecreaseInvoiceTypes.has(data.type)
//         ? product.price
//         : item.unitPrice !== undefined
//           ? new Decimal(item.unitPrice)
//           : product.price;


//       const lineTotal = unitPrice.mul(
//         item.quantity
//       );


//       subtotalAmount = subtotalAmount.plus(lineTotal);


//       return {
//         productId: item.productId,
//         quantity: item.quantity,
//         unitPrice,
//         lineTotal,
//       };
//     });
//     // =====================================================
//     // 4. Calculate Discount
//     // =====================================================

//     let discountAmount = new Decimal(0);


//     if (
//       data.discountType &&
//       data.discountValue !== undefined
//     ) {

//       const discountValue = new Decimal(
//         data.discountValue
//       );


//       if (data.discountType === "FIXED") {

//         discountAmount = discountValue;

//       }


//       if (data.discountType === "PERCENTAGE") {

//         discountAmount = subtotalAmount
//           .mul(discountValue)
//           .div(100);

//       }
//     }


//     if (
//       discountAmount.greaterThan(subtotalAmount)
//     ) {
//       throw new AppError(
//         400,
//         "Discount_cannot_exceed_subtotal"
//       );
//     }



//     // =====================================================
//     // 5. Calculate Tax
//     // =====================================================

//     // Later this will come from GeneralSetting and also we should include tax_inclusive
//     const taxRate = new Decimal(0);

//     const taxAmount = subtotalAmount
//       .minus(discountAmount)
//       .mul(taxRate)
//       .div(100);



//     // =====================================================
//     // 6. Calculate Total
//     // =====================================================

//     const totalAmount = subtotalAmount
//       .minus(discountAmount)
//       .plus(taxAmount);




//     // =====================================================
//     // 4. Validate Stock
//     // =====================================================

//     if (stockDecreaseInvoiceTypes.has(data.type)) {

//       for (const item of data.items) {

//         const product = products.find(
//           p => p.id === item.productId
//         )!;


//         if (product.stockQuantity < item.quantity) {

//           throw new AppError(
//             400,
//             "Insufficient_stock",
//             {
//               productId: product.id,
//               productName: product.name,
//               availableStock: product.stockQuantity,
//               requestedQuantity: item.quantity,
//             }
//           );
//         }
//       }
//     }



//     // =====================================================
//     // 5. Create Invoice
//     // =====================================================

//     const invoice = await tx.invoice.create({

//       data: {

//         type: data.type,
//         originalInvoiceId:
//           data.originalInvoiceId ?? null,
//         contactId: data.contactId ?? null,

//         userId,


//         subtotalAmount,

//         discountType:
//           data.discountType ?? null,

//         discountValue:
//           data.discountValue !== undefined
//             ? new Decimal(data.discountValue)
//             : null,

//         discountAmount,


//         taxRate,

//         taxAmount,


//         totalAmount,


//         paymentMethod:
//           data.paymentMethod,


//         items: {
//           create: invoiceItems,
//         },
//       },


//       include: {
//         items: true,
//       },

//     });


//     // =====================================================
//     // 6. Update Inventory
//     // =====================================================

//     for (const item of data.items) {

//       const stockChange = stockDecreaseInvoiceTypes.has(data.type)
//         ? -item.quantity
//         : item.quantity;


//       await tx.product.update({

//         where: {
//           id: item.productId,
//         },

//         data: {
//           stockQuantity: {
//             increment: stockChange,
//           },
//         },

//       });
//     }


//     return invoice;
//   });
// };
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