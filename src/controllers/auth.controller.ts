import { Request, Response } from "express";
import * as authService from "../services/auth.service";

const REFRESH_COOKIE_MAX_AGE =
  7 * 24 * 60 * 60 * 1000;

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  const result = await authService.login(
    email,
    password
  );

  res.cookie(
    "refresh_token",
    result.refreshToken,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "strict",
      maxAge: REFRESH_COOKIE_MAX_AGE,
    }
  );

  res.status(200).json({
    message: "LOGIN_SUCCESSFUL",
    accessToken: result.accessToken,
    user: result.user,
  });
};

export const refresh = async (
  req: Request,
  res: Response
): Promise<void> => {
  const refreshToken =
    req.cookies.refresh_token;

  if (!refreshToken) {
    res.status(401).json({
      error: "REFRESH_TOKEN_MISSING",
    });
    return;
  }

  const result =
    await authService.refreshAccessToken(
      refreshToken
    );

  res.status(200).json(result);
};

export const logout = (
  req: Request,
  res: Response
): void => {
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure:
      process.env.NODE_ENV ===
      "production",
    sameSite: "strict",
  });

  res.status(200).json({
    message: "LOGOUT_SUCCESSFUL",
  });
};