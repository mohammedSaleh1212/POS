import { ZodType, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (schema: ZodType) => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 400,
          message: 'Validation failed',
          errors: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
        return;
      }
      
      return next(error);
    }
};