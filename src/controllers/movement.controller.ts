import { Request, Response } from "express";
import * as movementService from "../services/movement.service";
import z from "zod";
// movement.schema.ts
export const startShiftSchema = z.object({
  body: z.object({
    startingCash: z.coerce.number().nonnegative("Starting cash must be 0 or greater"),
  })
});
// movement.schema.ts
export const endShiftSchema = z.object({
  body: z.object({
    endingCash: z.coerce.number().nonnegative("Ending cash must be a valid number"),
  })
});
export const startShift = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { startingCash } = req.body;
    
    const movement = await movementService.openShift(userId, startingCash);
    res.status(201).json(movement);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
export const previewExpectedCash = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const drawerStatus = await movementService.calculateExpectedCash(userId);
    res.json(drawerStatus);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const endShift = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { endingCash } = req.body; // ONLY trust the actual cash counted

    const movement = await movementService.closeShift(userId, endingCash);
    res.status(201).json(movement);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

