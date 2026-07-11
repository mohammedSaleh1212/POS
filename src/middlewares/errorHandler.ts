import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(code);

    // Preserve stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log all errors
  console.error("=================================");
  console.error("ERROR:", err);
  console.error("PATH:", req.method, req.originalUrl);
  console.error("=================================");

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      ...(err.details && { errors: err.details }),
    });
  }

  return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
  });
};