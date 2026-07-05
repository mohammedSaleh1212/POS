import { Request, Response } from "express";
import * as invoiceService from "../services/invoice.service";

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