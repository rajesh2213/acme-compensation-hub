import type { NextFunction, Request, Response } from "express";
import { loadEnv } from "../env.js";
import { AppError } from "../lib/errors.js";

type AttemptState = {
  count: number;
  resetAt: number;
};

/**
 * In-memory login rate limiter keyed by client IP (Express `req.ip`).
 *
 * Limitations:
 * - Counts are per process only — not shared across multiple API instances.
 * - Accurate client IPs require a trusted reverse proxy and `trust proxy`
 * - If clients can hit the API directly, or the proxy blindly forwards
 *   client-supplied forwarding headers, `req.ip` can be spoofed.
 */
const attempts = new Map<string, AttemptState>();

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function purgeExpired(now: number): void {
  for (const [key, state] of attempts) {
    if (state.resetAt <= now) {
      attempts.delete(key);
    }
  }
}

export function loginRateLimit(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const env = loadEnv();
    const now = Date.now();
    purgeExpired(now);

    const key = clientIp(req);
    const current = attempts.get(key);

    if (!current || current.resetAt <= now) {
      attempts.set(key, {
        count: 1,
        resetAt: now + env.loginRateLimitWindowMs,
      });
      next();
      return;
    }

    if (current.count >= env.loginRateLimitMax) {
      throw new AppError(
        429,
        "RATE_LIMITED",
        "Too many login attempts. Please try again later.",
      );
    }

    current.count += 1;
    attempts.set(key, current);
    next();
  } catch (error) {
    next(error);
  }
}

/** Test helper */
export function resetLoginRateLimitStore(): void {
  attempts.clear();
}
