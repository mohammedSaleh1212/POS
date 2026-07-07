import { Router } from "express";
import * as invoiceController from "../controllers/invoice.controller";
import { authenticate } from "../middlewares/tempAuth";
import { CreateInvoiceSchema } from "../controllers/invoice.controller";
import { validate } from "../middlewares/zodValidationMiddleware";

const router = Router();

// Notice: authenticate is required to attach req.user.id
router.post("/", authenticate,validate(CreateInvoiceSchema), invoiceController.create);
router.get("/", authenticate, invoiceController.findAll);

export default router;