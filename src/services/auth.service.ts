// src/services/auth.service.ts

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";
import { AppError } from "../middlewares/errorHandler";
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "../interfaces/auth";

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  "access_fallback_secret";

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "refresh_fallback_secret";

const generateAccessToken = (user: any): string => {
  const payload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: user.role.permissions as string[],
    },
  };

  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: "15m",
  });
};

export const login = async (
  email: string,
  password: string
) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (
    !user ||
    !(await bcrypt.compare(
      password,
      user.passwordHash
    ))
  ) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS"
    );
  }

  const accessToken =
    generateAccessToken(user);

  const refreshPayload: RefreshTokenPayload = {
    userId: user.id,
  };

  const refreshToken = jwt.sign(
    refreshPayload,
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role.name,
    },
  };
};

export const refreshAccessToken = async (
  refreshToken: string
) => {
  let decoded: RefreshTokenPayload;

  try {
    decoded = jwt.verify(
      refreshToken,
      REFRESH_SECRET
    ) as RefreshTokenPayload;
  } catch {
    throw new AppError(
      401,
      "INVALID_OR_EXPIRED_REFRESH_TOKEN"
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { role: true },
  });

  if (!user) {
    throw new AppError(
      401,
      "USER_NOT_FOUND"
    );
  }

  return {
    accessToken:
      generateAccessToken(user),
  };
};