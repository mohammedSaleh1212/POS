import { Decimal } from "@prisma/client/runtime/wasm-compiler-edge";
import { prisma } from "../db/prisma";
import { InvoiceType, InvoiceStatus, Prisma, Product } from "../generated/prisma";
import { CreateInvoiceInput, InvoiceItemInput, InvoiceQueryParams } from "../controllers/invoice.controller";
import { AppError } from "../middlewares/errorHandler";
import * as contactService from "../services/contact.service";
import * as productService from "../services/product.service";
const CUSTOMER_INVOICE_TYPES = new Set<InvoiceType>(["SALE", "RETURN_SALE"]);
const SUPPLIER_INVOICE_TYPES = new Set<InvoiceType>(["PURCHASE", "RETURN_PURCHASE"]);
const RETURN_INVOICE_TYPES = new Set<InvoiceType>(["RETURN_SALE", "RETURN_PURCHASE"]);
const STOCK_DECREASE_INVOICE_TYPES = new Set<InvoiceType>(["SALE", "RETURN_PURCHASE"]);

type InvoiceContactValidationInput = {
  type: InvoiceType;
  contactId?: number | undefined;
};

export async function validateInvoiceContact(
  tx: Prisma.TransactionClient,
  data: InvoiceContactValidationInput
) {


  if (
    SUPPLIER_INVOICE_TYPES.has(data.type) &&
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
    CUSTOMER_INVOICE_TYPES.has(data.type) &&
    !contact.isCustomer
  ) {
    throw new AppError(
      400,
      "Selected_contact_is_not_a_customer"
    );
  }

  if (
    SUPPLIER_INVOICE_TYPES.has(data.type) &&
    !contact.isSupplier
  ) {
    throw new AppError(
      400,
      "Selected_contact_is_not_a_supplier"
    );
  }

  return contact;
}
type OriginalInvoiceReturnValidationInput = {
  type: "PURCHASE" | "SALE" | "RETURN_PURCHASE" | "RETURN_SALE"; // Or use your Prisma InvoiceType enum
  originalInvoiceId?: number | undefined;
};
export const validateOriginalInvoiceForReturn = async (
  tx: Prisma.TransactionClient,
  data: OriginalInvoiceReturnValidationInput
) => {

  if (!RETURN_INVOICE_TYPES.has(data.type)) {
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
type ProductValidationItemInput = {
  productId: number;
};
export async function loadAndValidateProducts(
  tx: Prisma.TransactionClient,
  items: ProductValidationItemInput[]
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
type BuildInvoiceItemsInput = {
  type: "PURCHASE" | "SALE" | "RETURN_PURCHASE" | "RETURN_SALE"; // Or your InvoiceType enum
  items: {
    productId: number;
    quantity: number;
    unitPrice?: number | undefined;
  }[];
};
export const buildInvoiceItemsAndTotals = (
  data: BuildInvoiceItemsInput,
  productMap: Map<number, Product>,
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
export type DiscountType = "FIXED" | "PERCENTAGE";

export const calculateDiscount = (
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

export const calculateTax = (
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

export const determineInvoiceStatus = (
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
export const validateStockAvailability = (
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
export const updateInventoryAndCostPrices = async (
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
