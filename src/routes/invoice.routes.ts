import { Router } from "express";
import * as invoiceController from "../controllers/invoice.controller";
import { authenticate } from "../middlewares/tempAuth";

const router = Router();

// Notice: authenticate is required to attach req.user.id
router.post("/", authenticate, invoiceController.create);

export default router;