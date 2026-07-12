import { Request, Response } from "express";
import * as invoiceService from "../services/invoice.service";
import { z } from 'zod';
export const DiscountTypeEnum = z.enum(
  ["FIXED", "PERCENTAGE"],
  {
    message: "Invalid_discount_type",
  }
);
export const InvoiceTypeEnum = z.enum(
  ["PURCHASE", "SALE", "RETURN_PURCHASE", "RETURN_SALE"],
  {
    message: "Invalid_invoice_type",
  }
);

export const PaymentMethodEnum = z.enum(
  ["CASH", "CREDIT", "BANK_TRANSFER"],
  {
    message: "Invalid_payment_method",
  }
);

export const InvoiceItemSchema = z.object({
  productId: z
    .number()
    .int()
    .positive("Invalid_product_ID"),

  quantity: z
    .number()
    .positive("Quantity_must_be_greater_than_zero"),

  unitPrice: z
    .number()
    .nonnegative("Unit_price_cannot_be_negative")
    .optional(),
});
import { InvoiceStatus, InvoiceType } from "../generated/prisma"; // تأكد من أسماء الـ Enums لديك

export const InvoiceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(InvoiceStatus).optional(),
  type: z.nativeEnum(InvoiceType).optional(), // استبدلها باسم الـ Enum الصحيح في مشروعك
  contactId: z.coerce.number().positive().optional(),
  myInvoices: z.enum(["true", "false"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type InvoiceQueryParams = z.infer<typeof InvoiceQuerySchema>;
export const CreateInvoiceSchema = z.object({
  type: InvoiceTypeEnum,

  paymentMethod: PaymentMethodEnum,

  contactId: z
    .number()
    .int()
    .positive("Invalid_contact_ID")
    .optional(),

  discountType: DiscountTypeEnum.optional(),

  discountValue: z
    .number()
    .nonnegative("Discount_cannot_be_negative")
    .optional(),
    originalInvoiceId: z
  .number()
  .int()
  .positive("Invalid_original_invoice_ID")
  .optional(),
 
paidAmount: z
    .number()
    .nonnegative("Paid_amount_cannot_be_negative")
    .default(0),
  items: z
    .array(InvoiceItemSchema)
    .min(1, "Invoice_must_contain_at_least_one_item"),
});

// Infer types accurately from the internal 'body' object
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;



export const create = async (req: Request, res: Response) => {

    const userId = (req as any).user.id; 
    
    const invoice = await invoiceService.createInvoice(req.body, userId);
    res.status(201).json(invoice);

};



// const paymentMethodEnum = z.enum(["CASH", "CARD", "BANK_TRANSFER"]);
// const discountTypeEnum = z.enum(["PERCENTAGE", "FIXED"]);

export const previewInvoiceSchema = z.object({
  type: InvoiceTypeEnum,
  paymentMethod: PaymentMethodEnum.optional().default("CASH"),
  
  // Structural types match the creation schema exactly
  contactId: z.coerce.number().int().positive("Invalid_contact_ID").optional(),
  discountType: DiscountTypeEnum.optional().nullable(),
  discountValue: z.coerce.number().nonnegative("Discount_value_cannot_be_negative").optional().nullable(),
  originalInvoiceId: z.coerce.number().int().positive("Invalid_original_invoice_ID").optional(),
  
  paidAmount: z.coerce.number().nonnegative("Paid_amount_cannot_be_negative").optional().default(0),
  
  // Relaxed rule: Empty array allowed on live preview typing
  items: z.array(InvoiceItemSchema).default([])
});

export type PreviewInvoiceInput = z.infer<typeof previewInvoiceSchema>;
export const previewInvoiceController = async (
  req: Request<{}, {}, PreviewInvoiceInput>,
  res: Response,
): Promise<void> => {
    // req.body is pre-validated, sanitized, and typed by your Zod middleware
    const previewData = await invoiceService.previewInvoice(req.body);
    
    // Status 200 is used because we are calculating state, not creating resources
    res.status(200).json(previewData);

};
export const findAll = async (req: Request, res: Response) => {
    // Basic filter to let a user see their own history, or an admin to see all.
    // We will hook this up to real role permissions later.
    const query = InvoiceQuerySchema.parse(req.query);
const filterUserId = query.myInvoices === "true" ? (req as any).user.id : undefined;

const result = await invoiceService.getInvoices({
    ...query,
    userId: filterUserId,
  });    res.json(result);

};