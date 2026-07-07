import { Request, Response, NextFunction } from "express";
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string
  ) {
    super(code);
  }
}
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
    });
  }

  return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
  });
};