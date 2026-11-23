import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

export type ApiEnv = {
  port: number;
  databaseUrl: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadEnv(): ApiEnv {
  return {
    port: Number(process.env.PORT) || 4000,
    databaseUrl: requireEnv("DATABASE_URL"),
  };
}
