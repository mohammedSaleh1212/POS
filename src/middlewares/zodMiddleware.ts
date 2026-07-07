import { ZodType, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: ZodType, target: 'body' | 'query' | 'params' = 'body') => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate only the specific part (e.g., req.body)
      await schema.parseAsync(req[target]);
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 400,
          message: 'Validation failed',
          errors: error.issues.map(e => ({
            // This now returns just the field name, e.g., "barcode"
            field: e.path.join('.'),
            message: e.message
          }))
        });
        return;
      }
      return next(error);
    }
};