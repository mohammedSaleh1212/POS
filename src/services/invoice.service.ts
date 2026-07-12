import { Decimal } from "@prisma/client/runtime/wasm-compiler-edge";
import { prisma } from "../db/prisma";
import {  Prisma } from "../generated/prisma";
import { CreateInvoiceInput, InvoiceQueryParams, PreviewInvoiceInput } from "../controllers/invoice.controller";
import { getSettings } from "./settings.service";

import * as invoiceHelper from "../helpers/invoice.helpers";




export const createInvoice = async (data: CreateInvoiceInput, userId: number) => {
  return prisma.$transaction(async (tx) => {
 

    const settings = await getSettings();
    const { type, contactId } = data;
const contact = await invoiceHelper.validateInvoiceContact(tx, { type, contactId });
const {originalInvoiceId} = data;
const originalInvoice = await invoiceHelper.validateOriginalInvoiceForReturn(tx,{type, originalInvoiceId});

    // 4. تحميل المنتجات
// 4. Load and validate products
const productMap = await invoiceHelper.loadAndValidateProducts(tx, data.items);
    // 5. بناء بنود الفاتورة وحساب المجاميع
  const { invoiceItems, subtotalAmount } = invoiceHelper.buildInvoiceItemsAndTotals(
  data,
  productMap,
  originalInvoice 
);

    // 6. حساب الخصومات
// 6. Calculate discounts
const { discountAmount, subtotalAfterDiscount } = invoiceHelper.calculateDiscount(
  subtotalAmount,
  data.discountType,
  data.discountValue
);

// 7. Calculate taxes
const { taxRate, taxAmount, totalAmount } = invoiceHelper.calculateTax(
  subtotalAfterDiscount,
  settings // Ensure settings object is fetched prior to this step
);



    // 8. حساب حالة الدفع (Payment Status)
const { paidAmount, status } = invoiceHelper.determineInvoiceStatus(data.paidAmount, totalAmount);

    // 9. التحقق من المخزون
 invoiceHelper.validateStockAvailability(data.type, data.items, productMap);

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
 await invoiceHelper.updateInventoryAndCostPrices(tx, data.type, invoiceItems);

    return invoice;
  });
};
export const previewInvoice = async (data: PreviewInvoiceInput) => {
  // Uses standard prisma client, NO write transaction block
  const settings = await getSettings();
const { type, contactId } = data;
  await invoiceHelper.validateInvoiceContact(prisma, { type, contactId });
  const {originalInvoiceId} = data;
  const originalInvoice = await invoiceHelper.validateOriginalInvoiceForReturn(prisma, {type, originalInvoiceId});
  const productMap = await invoiceHelper.loadAndValidateProducts(prisma, data.items);

  // Run Calculations
  const { invoiceItems, subtotalAmount } = invoiceHelper.buildInvoiceItemsAndTotals(data, productMap, originalInvoice);
  const { discountAmount, subtotalAfterDiscount } = invoiceHelper.calculateDiscount(subtotalAmount, data.discountType, data.discountValue);
  const { taxRate, taxAmount, totalAmount } = invoiceHelper.calculateTax(subtotalAfterDiscount, settings);
  const { status } = invoiceHelper.determineInvoiceStatus(data.paidAmount, totalAmount);

 
    invoiceHelper.validateStockAvailability(data.type, data.items, productMap);


  return {
    subtotalAmount,
    discountAmount,
    taxRate,
    taxAmount,
    totalAmount,
    status,
    items: invoiceItems
  };
};

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