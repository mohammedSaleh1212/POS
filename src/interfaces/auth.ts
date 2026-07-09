// src/types/auth.ts
export interface AccessTokenPayload {
  userId: number;
  email: string;
  role: {
    id: number;
    name: string;
    permissions: string[];
  };
}

export interface RefreshTokenPayload {
  userId: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}