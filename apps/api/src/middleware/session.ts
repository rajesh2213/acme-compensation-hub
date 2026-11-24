import connectPgSimple from "connect-pg-simple";
import type { CookieOptions } from "express";
import type { RequestHandler } from "express";
import session from "express-session";
import { getPool } from "../db/pool.js";
import { loadEnv, type ApiEnv } from "../env.js";

export const SESSION_COOKIE_NAME = "acme.sid";

const PgSession = connectPgSimple(session);

/** Shared cookie attributes for issuing and clearing the session cookie. */
export function getSessionCookieOptions(
  env: Pick<ApiEnv, "cookieSecure" | "sessionTtlSeconds"> = loadEnv(),
): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: env.sessionTtlSeconds * 1000,
  };
}

/** Options for clearCookie — same identity attributes as the issued cookie. */
export function getSessionCookieClearOptions(
  env: Pick<ApiEnv, "cookieSecure"> = loadEnv(),
): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
  };
}

export function createSessionMiddleware(): RequestHandler {
  const env = loadEnv();

  return session({
    name: SESSION_COOKIE_NAME,
    store: new PgSession({
      pool: getPool(),
      tableName: "session",
      createTableIfMissing: false,
    }),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: getSessionCookieOptions(env),
  });
}
