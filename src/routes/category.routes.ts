// src/routes/category.routes.ts

import { Router } from "express";
import * as categoryController from "../controllers/category.controller";

const router = Router();

router.post("/", categoryController.create);
router.get("/", categoryController.findAll);
router.get("/:id", categoryController.findById);
router.put("/:id", categoryController.update);
router.delete("/:id", categoryController.remove);

export default router;