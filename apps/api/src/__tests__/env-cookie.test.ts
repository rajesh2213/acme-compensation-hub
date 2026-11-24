import { afterEach, describe, expect, it } from "vitest";
import { loadEnv, resetEnvCache } from "../env.js";

const REQUIRED = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/acme_compensation_hub_test",
  SESSION_SECRET: process.env.SESSION_SECRET ?? "test-session-secret-at-least-32-chars!!",
  TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS ?? "http://localhost:3000",
};

function withEnv(overrides: Record<string, string | undefined>, run: () => void): void {
  const keys = [
    "NODE_ENV",
    "COOKIE_SECURE",
    "DATABASE_URL",
    "SESSION_SECRET",
    "TRUSTED_ORIGINS",
  ] as const;
  const snapshot = Object.fromEntries(keys.map((k) => [k, process.env[k]]));

  try {
    process.env.DATABASE_URL = REQUIRED.DATABASE_URL;
    process.env.SESSION_SECRET = REQUIRED.SESSION_SECRET;
    process.env.TRUSTED_ORIGINS = REQUIRED.TRUSTED_ORIGINS;

    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    resetEnvCache();
    run();
  } finally {
    for (const key of keys) {
      const previous = snapshot[key];
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
    resetEnvCache();
  }
}

describe("COOKIE_SECURE configuration", () => {
  afterEach(() => {
    resetEnvCache();
  });

  it("forces Secure cookies in production even when COOKIE_SECURE=false", () => {
    withEnv({ NODE_ENV: "production", COOKIE_SECURE: "false" }, () => {
      expect(() => loadEnv()).toThrow(/COOKIE_SECURE/i);
    });
  });

  it("uses Secure cookies in production by default", () => {
    withEnv({ NODE_ENV: "production", COOKIE_SECURE: undefined }, () => {
      expect(loadEnv().cookieSecure).toBe(true);
    });
  });

  it("allows COOKIE_SECURE=false in development", () => {
    withEnv({ NODE_ENV: "development", COOKIE_SECURE: "false" }, () => {
      expect(loadEnv().cookieSecure).toBe(false);
    });
  });

  it("allows COOKIE_SECURE=true in development", () => {
    withEnv({ NODE_ENV: "development", COOKIE_SECURE: "true" }, () => {
      expect(loadEnv().cookieSecure).toBe(true);
    });
  });

  it("defaults to non-Secure cookies outside production when unset", () => {
    withEnv({ NODE_ENV: "test", COOKIE_SECURE: undefined }, () => {
      expect(loadEnv().cookieSecure).toBe(false);
    });
  });
});
