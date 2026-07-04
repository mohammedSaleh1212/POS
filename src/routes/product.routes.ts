// src/routes/product.routes.ts

import { Router } from "express";
import * as productController from "../controllers/product.controller";

const router = Router();

router.post("/", productController.create);
router.get("/", productController.findAll);
router.get("/:id", productController.findById);
router.put("/:id", productController.update);
router.delete("/:id", productController.remove);

export default router;