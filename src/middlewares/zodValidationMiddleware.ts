

import { ZodType, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

export const validate =
  (
    schema: ZodType,
    target: "body" | "query" | "params" = "body"
  ) =>
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await schema.parseAsync(req[target]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new AppError(
            400,
            "VALIDATION_FAILED",
            error.issues.map((e) => ({
              field: e.path.join("."),
              code: e.message,
            }))
          )
        );
      }

      next(error);
    }
  };