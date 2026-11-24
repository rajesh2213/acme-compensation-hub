import connectPgSimple from "connect-pg-simple";
import type { RequestHandler } from "express";
import session from "express-session";
import { getPool } from "../db/pool.js";
import { loadEnv } from "../env.js";

export const SESSION_COOKIE_NAME = "acme.sid";

const PgSession = connectPgSimple(session);

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
    cookie: {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: env.sessionTtlSeconds * 1000,
    },
  });
}
