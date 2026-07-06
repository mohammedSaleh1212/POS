import { Request, Response } from "express";
import * as movementService from "../services/movement.service";

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
    
    if (typeof endingCash !== 'number') {
      throw new Error("endingCash must be a valid number.");
    }

    const movement = await movementService.closeShift(userId, endingCash);
    res.status(201).json(movement);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

