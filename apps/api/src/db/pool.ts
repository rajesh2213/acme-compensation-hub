import pg from "pg";
import { loadEnv } from "../env.js";

const globalForPool = globalThis as typeof globalThis & {
  pgPool?: pg.Pool;
};

export function getPool(): pg.Pool {
  if (!globalForPool.pgPool) {
    const { databaseUrl } = loadEnv();
    globalForPool.pgPool = new pg.Pool({ connectionString: databaseUrl });
  }
  return globalForPool.pgPool;
}
