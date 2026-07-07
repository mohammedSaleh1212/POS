// src/routes/category.routes.ts

import { Router } from "express";
import * as categoryController from "../controllers/category.controller";
import { validate } from "../middlewares/zodValidationMiddleware";
import { createCategorySchema } from "../services/category.service";

const router = Router();

router.post("/",validate(createCategorySchema), categoryController.create);
router.get("/", categoryController.findAll);
router.get("/:id", categoryController.findById);
router.put("/:id",validate(createCategorySchema), categoryController.update);
router.delete("/:id", categoryController.remove);

export default router;