import type { PrismaClient } from "../../src/generated/prisma/client.js";

/**
 * Destructive wipe of domain data. Requires explicit opt-in and non-production.
 * Order respects ON DELETE RESTRICT foreign keys.
 */
export async function resetSeedData(prisma: PrismaClient): Promise<void> {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const resetFlag = process.env.SEED_RESET?.trim().toLowerCase();

  if (resetFlag !== "true" && resetFlag !== "1") {
    throw new Error(
      "Destructive reseed refused: set SEED_RESET=true to clear existing seed data.",
    );
  }

  if (nodeEnv === "production") {
    throw new Error("Destructive reseed is not allowed when NODE_ENV=production.");
  }

  console.log("SEED_RESET enabled — clearing domain tables…");

  await prisma.$transaction([
    prisma.salaryRevision.deleteMany(),
    prisma.salary.deleteMany(),
    prisma.session.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.user.deleteMany(),
    prisma.department.deleteMany(),
    prisma.country.deleteMany(),
  ]);
}
