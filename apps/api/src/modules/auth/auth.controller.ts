import type { Request, Response } from "express";
import { ensureCsrfToken } from "../../middleware/csrf.js";
import {
  getSessionCookieClearOptions,
  SESSION_COOKIE_NAME,
} from "../../middleware/session.js";
import { sendSuccess } from "../../lib/response.js";
import { AppError } from "../../lib/errors.js";
import { authenticateUser } from "./auth.service.js";
import type { LoginBody } from "./auth.schemas.js";

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

export async function getCsrfToken(req: Request, res: Response): Promise<void> {
  const token = await ensureCsrfToken(req);
  sendSuccess(res, { csrfToken: token });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginBody;
  const user = await authenticateUser(email, password);

  await regenerateSession(req);
  req.session.userId = user.id;
  delete req.session.csrfToken;
  await saveSession(req);

  sendSuccess(res, { user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

  res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieClearOptions());

  sendSuccess(res, { loggedOut: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }
  sendSuccess(res, { user: req.user });
}
