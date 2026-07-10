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
export const findAll = async (req: Request, res: Response) => {
    // Basic filter to let a user see their own history, or an admin to see all.
    // We will hook this up to real role permissions later.
    const filterByUser = req.query.myInvoices === "true";
    const userId = filterByUser ? (req as any).user.id : undefined;

    const invoices = await invoiceService.getInvoices(userId);
    res.json(invoices);

};