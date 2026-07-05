import { Router } from "express";
import * as movementController from "../controllers/movement.controller";
import { authenticate } from "../middlewares/tempAuth";

const router = Router();

// Notice: authenticate is required to attach req.user.id
router.post("/shift/start", authenticate, movementController.startShift);
// Note: You need to create the endShift controller in your movement.controller.ts to match this
// router.post("/shift/end", authenticate, movementController.endShift); 

export default router;