import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { getActiveUserById } from "../modules/auth/auth.service.js";

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.session.userId;
    if (!userId) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    req.user = await getActiveUserById(userId);
    next();
  } catch (error) {
    next(error);
  }
}
