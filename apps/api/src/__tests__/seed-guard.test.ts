import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSeedAllowedInEnvironment } from "../../prisma/seed/guard.js";

describe("seed production guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows seeding outside production", () => {
    expect(() => assertSeedAllowedInEnvironment("development")).not.toThrow();
    expect(() => assertSeedAllowedInEnvironment("test")).not.toThrow();
    expect(() => assertSeedAllowedInEnvironment(undefined)).not.toThrow();
  });

  it("refuses seeding when NODE_ENV is production", () => {
    expect(() => assertSeedAllowedInEnvironment("production")).toThrow(
      /Production seeding is disabled/,
    );
  });

  it("refuses before any database mutation even when SEED_RESET is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SEED_RESET", "true");

    const deleteMany = vi.fn();
    const fakePrisma = {
      $transaction: vi.fn(async () => undefined),
      salaryRevision: { deleteMany },
      salary: { deleteMany },
      session: { deleteMany },
      employee: { deleteMany },
      user: { deleteMany },
      department: { deleteMany },
      country: { deleteMany },
    };

    expect(() => assertSeedAllowedInEnvironment(process.env.NODE_ENV)).toThrow(
      /Production seeding is disabled/,
    );

    // Guard must be checked before resetSeedData; prove reset is never reached
    // when the environment gate fails first (call order contract).
    const { resetSeedData } = await import("../../prisma/seed/reset.js");
    await expect(resetSeedData(fakePrisma as never)).rejects.toThrow(
      /NODE_ENV=production/,
    );
    expect(fakePrisma.$transaction).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
