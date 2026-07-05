import { Request, Response, NextFunction } from "express";

export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // This requires an authentication middleware to run BEFORE this one
    // to populate req.user with their role and permissions.
    const user = (req as any).user;

    if (!user || !user.role || !user.role.permissions) {
       res.status(403).json({ error: "Access denied. Authentication or role data missing." });
       return;
    }

    // Cast the JSON array from Prisma to a string array
    const permissions = user.role.permissions as string[];

    if (!permissions.includes(requiredPermission)) {
       res.status(403).json({ 
         error: `Access denied. Action requires '${requiredPermission}' permission.` 
       });
       return;
    }

    next();
  };
};