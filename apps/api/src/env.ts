import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

export type ApiEnv = {
  port: number;
  databaseUrl: string;
  nodeEnv: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  cookieSecure: boolean;
  trustedOrigins: string[];
  loginRateLimitMax: number;
  loginRateLimitWindowMs: number;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePositiveInt(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function parseTrustedOrigins(raw: string): string[] {
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("TRUSTED_ORIGINS must include at least one origin");
  }

  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`TRUSTED_ORIGINS contains an invalid origin: ${origin}`);
    }
    if (parsed.origin !== origin) {
      throw new Error(
        `TRUSTED_ORIGINS entries must be exact origins (no path/query): ${origin}`,
      );
    }
  }

  return origins;
}

function parseCookieSecure(nodeEnv: string, raw: string | undefined): boolean {
  const production = nodeEnv === "production";

  if (raw === undefined || raw.trim() === "") {
    return production;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized !== "true" && normalized !== "1" && normalized !== "false" && normalized !== "0") {
    throw new Error("COOKIE_SECURE must be true or false");
  }

  const requestedSecure = normalized === "true" || normalized === "1";

  // Production cookies must always be Secure; refuse misconfiguration.
  if (production && !requestedSecure) {
    throw new Error(
      "COOKIE_SECURE=false is not allowed in production; Secure cookies are required",
    );
  }

  return requestedSecure;
}

let cachedEnv: ApiEnv | undefined;

export function loadEnv(): ApiEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const nodeEnv = process.env.NODE_ENV?.trim() || "development";
  const sessionSecret = requireEnv("SESSION_SECRET");
  if (nodeEnv === "production" && sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production");
  }

  cachedEnv = {
    port: Number(process.env.PORT) || 4000,
    databaseUrl: requireEnv("DATABASE_URL"),
    nodeEnv,
    sessionSecret,
    sessionTtlSeconds: parsePositiveInt("SESSION_TTL", process.env.SESSION_TTL, 28_800),
    cookieSecure: parseCookieSecure(nodeEnv, process.env.COOKIE_SECURE),
    trustedOrigins: parseTrustedOrigins(requireEnv("TRUSTED_ORIGINS")),
    loginRateLimitMax: parsePositiveInt(
      "LOGIN_RATE_LIMIT_MAX",
      process.env.LOGIN_RATE_LIMIT_MAX,
      10,
    ),
    loginRateLimitWindowMs: parsePositiveInt(
      "LOGIN_RATE_LIMIT_WINDOW_MS",
      process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
      15 * 60 * 1000,
    ),
  };

  return cachedEnv;
}

/** Test helper — clears cached env so process.env changes take effect. */
export function resetEnvCache(): void {
  cachedEnv = undefined;
}
