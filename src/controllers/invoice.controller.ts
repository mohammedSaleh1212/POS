import { Request, Response } from "express";
import * as invoiceService from "../services/invoice.service";
import { z } from 'zod';

export const InvoiceTypeEnum = z.enum(["PURCHASE", "SALE", "RETURN_PURCHASE", "RETURN_SALE"]);
export const PaymentMethodEnum = z.enum(["CASH", "CREDIT", "BANK_TRANSFER"]);

export const InvoiceItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
});

// Wrapped in 'body' to match your existing middleware pattern
export const CreateInvoiceSchema = z.object({
    type: InvoiceTypeEnum,
    paymentMethod: PaymentMethodEnum,
    customerId: z.number().int().positive().optional(),
    items: z.array(InvoiceItemSchema).min(1),
});

// Infer types accurately from the internal 'body' object
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;



export const create = async (req: Request, res: Response) => {
  try {
    // Assuming you have auth middleware that attaches the user to the request
    const userId = (req as any).user.id; 
    
    const invoice = await invoiceService.createInvoice(req.body, userId);
    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
export const findAll = async (req: Request, res: Response) => {
  try {
    // Basic filter to let a user see their own history, or an admin to see all.
    // We will hook this up to real role permissions later.
    const filterByUser = req.query.myInvoices === "true";
    const userId = filterByUser ? (req as any).user.id : undefined;

    const invoices = await invoiceService.getInvoices(userId);
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};