import { Router } from "express";
import * as invoiceController from "../controllers/invoice.controller";
import { authenticate } from "../middlewares/tempAuth";
import { CreateInvoiceSchema, InvoiceQuerySchema } from "../controllers/invoice.controller";
import { validate } from "../middlewares/zodValidationMiddleware";

const router = Router();

// Notice: authenticate is required to attach req.user.id
router.post("/", authenticate,validate(CreateInvoiceSchema), invoiceController.create);
router.get("/", authenticate,validate(InvoiceQuerySchema, "query"), invoiceController.findAll);

export default router;