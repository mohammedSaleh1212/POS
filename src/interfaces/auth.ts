// src/types/auth.ts

export interface JWTPayload {
  userId: number;
  email: string;
  role: {
    id: number;
    name: string;
    permissions: string[];
  };
}

// Extend Express Request interface to hold user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}