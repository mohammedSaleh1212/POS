import { Router } from "express";
import { getSettings, updateSettings, updateSettingsSchema } from "../controllers/settings.controller";
import { validate } from "../middlewares/zodValidationMiddleware";
import { authenticate } from "../middlewares/tempAuth";


const router = Router();

router.put("/", authenticate, validate(updateSettingsSchema), updateSettings);
router.get("/", authenticate, getSettings);

export default router;