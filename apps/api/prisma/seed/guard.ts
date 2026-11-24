/**
 * Unconditional production refuse for the seed entrypoint.
 * Must run before any database mutation (including SEED_RESET).
 */
export function assertSeedAllowedInEnvironment(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if ((nodeEnv ?? "development") === "production") {
    throw new Error(
      "Production seeding is disabled. The seed script refuses to run when NODE_ENV=production (including SEED_RESET).",
    );
  }
}
