import { Request, Response } from "express";
import * as movementService from "../services/movement.service";
import z from "zod";
// movement.schema.ts
export const startShiftSchema = z.object({
    startingCash: z.coerce.number().nonnegative("Starting_cash_must_be_0_or_greater"),
});
// movement.schema.ts
export const endShiftSchema = z.object({
    endingCash: z.coerce.number().nonnegative("Ending_cash_must_be_a_valid_number"),
});
export const startShift = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { startingCash } = req.body;
    
    const movement = await movementService.openShift(userId, startingCash);
    res.status(201).json(movement);

};
export const previewExpectedCash = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const drawerStatus = await movementService.calculateExpectedCash(userId);
    res.json(drawerStatus);

};

export const endShift = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { endingCash } = req.body; // ONLY trust the actual cash counted

    const movement = await movementService.closeShift(userId, endingCash);
    res.status(201).json(movement);

};

