// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AccessTokenPayload } from '../interfaces/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies.auth_token;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};