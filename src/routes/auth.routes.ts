// src/routes/category.routes.ts

import { Router } from "express";
import { validate } from "../middlewares/zodValidationMiddleware";
import { loginSchema } from "../schemas/auth.schema";
import * as authcontroller from "../controllers/auth.controller";


const router = Router();

router.post("/login",validate(loginSchema), authcontroller.login);
router.post("/refresh", authcontroller.refresh);
router.post("/logout", authcontroller.logout);

export default router;