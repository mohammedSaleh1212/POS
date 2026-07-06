import { Router } from "express";
import * as movementController from "../controllers/movement.controller";
import { authenticate } from "../middlewares/tempAuth";

const router = Router();

router.post("/shift/start", authenticate, movementController.startShift);
router.post("/shift/end", authenticate, movementController.endShift);
router.get("/shift/preview", authenticate, movementController.previewExpectedCash);

export default router;