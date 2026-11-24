import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { loadEnv } from "../env.js";
import { AppError } from "../lib/errors.js";
import { assertTrustedOrigin } from "../lib/origins.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function tokensEqual(expected: string, provided: string): boolean {
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, providedBuf);
}

export function createCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export async function ensureCsrfToken(req: Request): Promise<string> {
  if (!req.session.csrfToken) {
    req.session.csrfToken = createCsrfToken();
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
  }
  return req.session.csrfToken;
}

export function csrfProtection(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (SAFE_METHODS.has(req.method.toUpperCase())) {
        next();
        return;
      }

      const env = loadEnv();
      assertTrustedOrigin(req, env.trustedOrigins);

      const headerToken = req.get("x-csrf-token")?.trim();
      const sessionToken = req.session.csrfToken;

      if (!headerToken || !sessionToken || !tokensEqual(sessionToken, headerToken)) {
        throw new AppError(403, "CSRF_TOKEN_INVALID", "Invalid CSRF token");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
