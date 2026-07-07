import { Router } from "express";
import * as movementController from "../controllers/movement.controller";
import { authenticate } from "../middlewares/tempAuth";
import { validateRequest } from "../middlewares/zodMiddleware";
import { endShiftSchema, startShiftSchema } from "../controllers/movement.controller";

const router = Router();

router.post("/shift/start", authenticate,validateRequest(startShiftSchema) ,movementController.startShift);
router.post("/shift/end", authenticate, validateRequest(endShiftSchema), movementController.endShift);
router.get("/shift/preview", authenticate, movementController.previewExpectedCash);

export default router;