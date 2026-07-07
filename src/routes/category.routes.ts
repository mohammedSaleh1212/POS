// src/routes/category.routes.ts

import { Router } from "express";
import * as categoryController from "../controllers/category.controller";
import { validateRequest } from "../middlewares/zodMiddleware";
import { createCategorySchema } from "../services/category.service";

const router = Router();

router.post("/",validateRequest(createCategorySchema), categoryController.create);
router.get("/", categoryController.findAll);
router.get("/:id", categoryController.findById);
router.put("/:id",validateRequest(createCategorySchema), categoryController.update);
router.delete("/:id", categoryController.remove);

export default router;