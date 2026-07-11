import { Decimal } from "@prisma/client/runtime/wasm-compiler-edge";
import { prisma } from "../db/prisma";
import { InvoiceType, InvoiceStatus, Prisma, Product } from "../generated/prisma";
import { CreateInvoiceInput, InvoiceItemInput, InvoiceQueryParams } from "../controllers/invoice.controller";
import { AppError } from "../middlewares/errorHandler";
import { getSettings } from "./settings.service";
import * as contactService from "./contact.service";
import * as productService from "./product.service";
import * as invoiceHelper from "../helpers/invoice.helpers";
const CUSTOMER_INVOICE_TYPES = new Set<InvoiceType>(["SALE", "RETURN_SALE"]);
const SUPPLIER_INVOICE_TYPES = new Set<InvoiceType>(["PURCHASE", "RETURN_PURCHASE"]);
const RETURN_INVOICE_TYPES = new Set<InvoiceType>(["RETURN_SALE", "RETURN_PURCHASE"]);
const STOCK_DECREASE_INVOICE_TYPES = new Set<InvoiceType>(["SALE", "RETURN_PURCHASE"]);

async function validateInvoiceContact(
  tx: Prisma.TransactionClient,
  data: CreateInvoiceInput
) {
  const customerInvoiceTypes = new Set<InvoiceType>([
    "SALE",
    "RETURN_SALE",
  ]);

  const supplierInvoiceTypes = new Set<InvoiceType>([
    "PURCHASE",
    "RETURN_PURCHASE",
  ]);

  if (
    supplierInvoiceTypes.has(data.type) &&
    !data.contactId
  ) {
    throw new AppError(
      400,
      "Supplier_is_required"
    );
  }

  if (!data.contactId) {
    return null;
  }

  const contact =
    await contactService.getContactById(
      data.contactId,
      tx
    );

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

  return contact;
}
const validateOriginalInvoiceForReturn = async (
  tx: Prisma.TransactionClient,
  data: CreateInvoiceInput
) => {
      const returnInvoiceTypes = new Set<InvoiceType>(["RETURN_SALE", "RETURN_PURCHASE"]);

  if (!returnInvoiceTypes.has(data.type)) {
    return null;
  }

  if (!data.originalInvoiceId) {
    throw new AppError(
      400,
      "Original_invoice_is_required_for_return"
    );
  }

  const originalInvoice = await tx.invoice.findUnique({
    where: {
      id: data.originalInvoiceId,
    },
    include: {
      items: true,
    },
  });

  if (!originalInvoice) {
    throw new AppError(
      404,
      "Original_invoice_not_found"
    );
  }

  if (
    data.type === "RETURN_SALE" &&
    originalInvoice.type !== "SALE"
  ) {
    throw new AppError(
      400,
      "Return_sale_must_reference_sale_invoice"
    );
  }

  if (
    data.type === "RETURN_PURCHASE" &&
    originalInvoice.type !== "PURCHASE"
  ) {
    throw new AppError(
      400,
      "Return_purchase_must_reference_purchase_invoice"
    );
  }

  return originalInvoice;
};
async function loadAndValidateProducts(
  tx: Prisma.TransactionClient,
  items: InvoiceItemInput[]
) {
  if (!items || items.length === 0) {
    throw new AppError(400, "Invoice_must_contain_at_least_one_item");
  }

  // 1. Extract all unique product IDs
  const productIds = [...new Set(items.map((item) => item.productId))];

  // 2. Fetch all products in one query using your productsService
  // Ensure your productsService.getProductsByIds accepts the 'tx' client
  const products = await productService.getProductsByIds(productIds, tx);

  // 3. Validate all requested products exist
  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((p) => p.id));
    const missingIds = productIds.filter((id) => !foundIds.has(id));
    
    throw new AppError(
      400,
      `Products_not_found: ${missingIds.join(", ")}`
    );
  }

  // 4. Return as a Map for O(1) lookups during total calculation and stock validation
  const productMap = new Map<number, typeof products[0]>();
  for (const product of products) {
    productMap.set(product.id, product);
  }

  return productMap;
}
// Make sure you import Prisma types if needed for the originalInvoice type

const buildInvoiceItemsAndTotals = (
  data: CreateInvoiceInput,
  productMap: Map<number, Product>, // Replace 'any' with your actual Product type from Prisma
originalInvoice: Prisma.InvoiceGetPayload<{
  include: {
    items: true;
  };
}> | null) => {
  let subtotalAmount = new Decimal(0);

  const invoiceItems = data.items.map((item) => { // 'item' is typed automatically if data.items is typed
    const product = productMap.get(item.productId);
    
    // Safety check, though loadAndValidateProducts already ensured they exist
    if (!product) {
      throw new AppError(500, `Product_missing_from_map_${item.productId}`);
    }

    let unitPrice = new Decimal(0);
    let costPrice = new Decimal(product.costPrice);

    if (data.type === "SALE") {
      if (item.unitPrice !== undefined) {
        unitPrice = new Decimal(item.unitPrice);
      } else if (product.sellingPrice !== null) {
        unitPrice = new Decimal(product.sellingPrice);
      } else {
        throw new AppError(
          400,
          "Selling_price_required_for_product",
          {
            productId: product.id,
            productName: product.name,
          }
        );
      }
    } else if (data.type === "PURCHASE") {
      unitPrice = item.unitPrice !== undefined ? new Decimal(item.unitPrice) : new Decimal(product.costPrice);
      costPrice = unitPrice; // In purchase invoice, unit price is the actual cost
    } else if (RETURN_INVOICE_TYPES.has(data.type)) {
      // For returns, price and cost MUST come from the original invoice
      const originalItem = originalInvoice!.items.find((i: { productId: number; quantity: number; unitPrice: any; costPrice: any }) => i.productId === item.productId);
      
      if (!originalItem) {
        throw new AppError(400, `Product ${product.name} not found in original invoice`);
      }
      if (item.quantity > originalItem.quantity) {
        throw new AppError(400, `Return quantity exceeds original for ${product.name}`);
      }

      unitPrice = new Decimal(originalItem.unitPrice);
      costPrice = new Decimal(originalItem.costPrice);
    }

    const lineTotal = unitPrice.mul(item.quantity);
    subtotalAmount = subtotalAmount.plus(lineTotal);

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      costPrice, // Mandatory for later profit calculation
      lineTotal,
    };
  });

  return { invoiceItems, subtotalAmount };
};
type DiscountType = "FIXED" | "PERCENTAGE";
const calculateDiscount = (
  subtotalAmount: Decimal,
  discountType?: DiscountType | null,
  discountValue?: number | Decimal | null
) => {
  let discountAmount = new Decimal(0);

  if (discountType && discountValue !== undefined && discountValue !== null) {
    const val = new Decimal(discountValue);
    
    if (discountType === "FIXED") {
      discountAmount = val;
    } else if (discountType === "PERCENTAGE") {
      discountAmount = subtotalAmount.mul(val).div(100);
    }
  }

  if (discountAmount.greaterThan(subtotalAmount)) {
    throw new AppError(400, "Discount_cannot_exceed_subtotal");
  }

  const subtotalAfterDiscount = subtotalAmount.minus(discountAmount);

  return { discountAmount, subtotalAfterDiscount };
};

interface TaxSettings {
  taxEnabled: boolean;
  taxRate: number | string | Decimal;
  taxInclusive: boolean;
}

const calculateTax = (
  subtotalAfterDiscount: Decimal,
  settings: TaxSettings
) => {
  let taxRate = new Decimal(0);
  let taxAmount = new Decimal(0);
  let totalAmount = subtotalAfterDiscount;

  if (settings.taxEnabled) {
    taxRate = new Decimal(settings.taxRate);

    if (settings.taxInclusive) {
      // Tax-inclusive pricing extraction
      const divisor = new Decimal(1).plus(taxRate.div(100));
      const subtotalWithoutTax = subtotalAfterDiscount.div(divisor);
      taxAmount = subtotalAfterDiscount.minus(subtotalWithoutTax);
      totalAmount = subtotalAfterDiscount; 
    } else {
      // Tax-exclusive pricing addition
      taxAmount = subtotalAfterDiscount.mul(taxRate).div(100);
      totalAmount = subtotalAfterDiscount.plus(taxAmount);
    }
  }

  return { taxRate, taxAmount, totalAmount };
};

const determineInvoiceStatus = (
  inputPaidAmount: number | string | Decimal | undefined | null,
  totalAmount: Decimal
) => {
  const paidAmount = new Decimal(inputPaidAmount ?? 0);
  let status: InvoiceStatus = InvoiceStatus.UNPAID;

  if (paidAmount.greaterThanOrEqualTo(totalAmount)) {
    status = InvoiceStatus.PAID;
  } else if (paidAmount.greaterThan(0)) {
    status = InvoiceStatus.PARTIAL;
  }

  return { paidAmount, status };
};
const validateStockAvailability = (
  invoiceType: InvoiceType,
  items:InvoiceItemInput[],
  productMap: Map<number, Product> // Replace 'any' with your actual Product type from Prisma
) => {
  if (!STOCK_DECREASE_INVOICE_TYPES.has(invoiceType)) {
    return;
  }

  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new AppError(500, `Product_missing_from_map_${item.productId}`);
    }

    if (product.stockQuantity < item.quantity) {
      throw new AppError(400, "Insufficient_stock", {
        productId: product.id,
        productName: product.name,
      });
    }
  }
};
const updateInventoryAndCostPrices = async (
  tx: Prisma.TransactionClient,
  invoiceType: InvoiceType,
  invoiceItems: Array<{ productId: number; quantity: number; unitPrice: Decimal }>
) => {
  for (const item of invoiceItems) {
    const stockChange = STOCK_DECREASE_INVOICE_TYPES.has(invoiceType)
      ? -item.quantity
      : item.quantity;

    const updateData: Prisma.ProductUpdateInput = {
      stockQuantity: { increment: stockChange },
    };

    // Update product cost price if this is a purchase invoice
    if (invoiceType === "PURCHASE") {
      updateData.costPrice = item.unitPrice;
    }

    await tx.product.update({
      where: { id: item.productId },
      data: updateData,
    });
  }
};

export const createInvoice = async (data: CreateInvoiceInput, userId: number) => {
  return prisma.$transaction(async (tx) => {
    const customerInvoiceTypes = new Set<InvoiceType>(["SALE", "RETURN_SALE"]);
    const supplierInvoiceTypes = new Set<InvoiceType>(["PURCHASE", "RETURN_PURCHASE"]);
    const stockDecreaseInvoiceTypes = new Set<InvoiceType>(["SALE", "RETURN_PURCHASE"]);
    const returnInvoiceTypes = new Set<InvoiceType>(["RETURN_SALE", "RETURN_PURCHASE"]);

    const settings = await getSettings();
    const contact = await validateInvoiceContact(tx, data);

    // 3. التحقق من الفاتورة الأصلية للمرتجعات
const originalInvoice = await validateOriginalInvoiceForReturn(tx,data);

    // 4. تحميل المنتجات
// 4. Load and validate products
const productMap = await loadAndValidateProducts(tx, data.items);

    // 5. بناء بنود الفاتورة وحساب المجاميع
  const { invoiceItems, subtotalAmount } = buildInvoiceItemsAndTotals(
  data,
  productMap,
  originalInvoice 
);

    // 6. حساب الخصومات
// 6. Calculate discounts
const { discountAmount, subtotalAfterDiscount } = calculateDiscount(
  subtotalAmount,
  data.discountType,
  data.discountValue
);

// 7. Calculate taxes
const { taxRate, taxAmount, totalAmount } = calculateTax(
  subtotalAfterDiscount,
  settings // Ensure settings object is fetched prior to this step
);

    // 8. حساب حالة الدفع (Payment Status)
const { paidAmount, status } = determineInvoiceStatus(data.paidAmount, totalAmount);

    // 9. التحقق من المخزون
validateStockAvailability(data.type, data.items, productMap)

    // 10. إنشاء الفاتورة
    const invoice = await tx.invoice.create({
      data: {
        type: data.type,
        status: status,
        originalInvoiceId: data.originalInvoiceId ?? null,
        contactId: contact?.id ?? null,
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
 await updateInventoryAndCostPrices(tx, data.type, invoiceItems);

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
interface GetInvoicesParams extends InvoiceQueryParams {
  userId?: number;
}

export const getInvoices = async (params: GetInvoicesParams) => {
  const { page, limit, status, type, contactId, userId, startDate, endDate } = params;

  // 1. بناء الـ Where Clause بشكل ديناميكي
  const where: Prisma.InvoiceWhereInput = {};

  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (type) where.type = type;
  if (contactId) where.contactId = contactId;

  // فلترة حسب التاريخ إذا توفرت القيم
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  // 2. حساب معادلة الـ Pagination
  const skip = (page - 1) * limit;

  // 3. جلب العدد الإجمالي والبيانات معاً عبر Transaction
  const [totalItems, invoices] = await prisma.$transaction([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
        user: { select: { fullName: true } },
        contact: { select: { fullName: true, phoneNumber: true } },
      },
    }),
  ]);

  // 4. إرجاع النتيجة بهيكل جاهز للـ Frontend
  return {
    meta: {
      totalItems,
      itemCount: invoices.length,
      itemsPerPage: limit,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    },
    data: invoices,
  };
};