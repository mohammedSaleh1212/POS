// src/routes/product.routes.ts

import { Router } from "express";
import * as productController from "../controllers/product.controller";
import { authenticate } from "../middlewares/tempAuth";
import { validate } from "../middlewares/zodMiddleware";

const router = Router();

router.post("/",authenticate,validate(productController.createProductSchema), productController.create);
router.get("/",  authenticate, productController.findAll);
router.get("/:id",  authenticate, productController.findById);
router.put("/:id", authenticate,validate(productController.updateProductSchema), productController.update);
router.delete("/:id", authenticate, productController.remove);
export default router;