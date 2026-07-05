import { Request, Response, NextFunction } from "express";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // MOCK USER: Hardcoded for frontend testing. 
  // Replace this with actual JWT decoding later.
  (req as any).user = { 
    id: 1, 
    role: "cashier" 
  };
  
  next();
};