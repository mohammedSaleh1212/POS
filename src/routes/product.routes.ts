// src/routes/product.routes.ts

import { Router } from "express";
import * as productController from "../controllers/product.controller";
import { authenticate } from "../middlewares/tempAuth";

const router = Router();

router.post("/",authenticate, productController.create);
router.get("/", authenticate, productController.findAll);
router.get("/:id", authenticate, productController.findById);
router.put("/:id", authenticate, productController.update);
router.delete("/:id", authenticate, productController.remove);
export default router;