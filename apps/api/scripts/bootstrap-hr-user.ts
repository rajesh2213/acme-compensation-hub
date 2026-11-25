/**
 * One-time production HR account bootstrap.
 *
 * Usage (password via env only — never commit secrets):
 *
 *   DATABASE_URL="..." NODE_ENV=production \
 *     BOOTSTRAP_HR_EMAIL="hr@example.com" \
 *     BOOTSTRAP_HR_PASSWORD="..." \
 *     BOOTSTRAP_HR_DISPLAY_NAME="HR Manager" \
 *     pnpm --filter api bootstrap:hr
 *
 * Refuses to overwrite an existing user with the same email.
 * Does not run the development seed.
 * BOOTSTRAP_HR_PASSWORD is not trimmed (intentional spaces are preserved).
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { prisma } from "../src/db/prisma.js";
import { bootstrapHrUser } from "../src/lib/bootstrap-hr-user.js";

config({ path: resolve(process.cwd(), ".env") });

function requireTrimmedEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Password env: present and non-empty after a whitespace-only check, but not trimmed. */
function requirePasswordEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (value.trim().length === 0) {
    throw new Error(`${name} must not be empty or whitespace-only`);
  }
  return value;
}

async function main(): Promise<void> {
  const email = requireTrimmedEnv("BOOTSTRAP_HR_EMAIL");
  const password = requirePasswordEnv("BOOTSTRAP_HR_PASSWORD");
  const displayName =
    process.env.BOOTSTRAP_HR_DISPLAY_NAME?.trim() || "HR Manager";

  const user = await bootstrapHrUser(
    { email, password, displayName },
    {
      findByEmail: (lookupEmail) =>
        prisma.user.findUnique({
          where: { email: lookupEmail },
          select: { id: true },
        }),
      createUser: (data) =>
        prisma.user.create({
          data,
          select: { id: true, email: true, displayName: true },
        }),
    },
  );

  console.log(
    JSON.stringify({
      created: true,
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    }),
  );
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
