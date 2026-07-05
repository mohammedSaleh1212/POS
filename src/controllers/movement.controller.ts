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