// src/routes/product.routes.ts

import { Router } from "express";
import * as productController from "../controllers/product.controller";
import { authenticate } from "../middlewares/tempAuth";
import { validateRequest } from "../middlewares/zodMiddleware";

const router = Router();

router.post("/",validateRequest(productController.createProductSchema),authenticate, productController.create);
router.get("/",  authenticate, productController.findAll);
router.get("/:id",  authenticate, productController.findById);
router.put("/:id", validateRequest(productController.updateProductSchema), authenticate, productController.update);
router.delete("/:id", authenticate, productController.remove);
export default router;