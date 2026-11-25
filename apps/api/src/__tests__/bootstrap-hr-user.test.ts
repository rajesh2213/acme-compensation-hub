import { describe, expect, it, vi } from "vitest";
import {
  bootstrapHrUser,
  validateBootstrapHrInput,
} from "../lib/bootstrap-hr-user.js";

describe("validateBootstrapHrInput", () => {
  it("accepts a valid payload", () => {
    expect(() =>
      validateBootstrapHrInput({
        email: "hr@example.com",
        password: "long-enough-secret",
        displayName: "HR Manager",
      }),
    ).not.toThrow();
  });

  it("rejects invalid email", () => {
    expect(() =>
      validateBootstrapHrInput({
        email: "not-an-email",
        password: "long-enough-secret",
        displayName: "HR Manager",
      }),
    ).toThrow(/BOOTSTRAP_HR_EMAIL/);
  });

  it("rejects short passwords", () => {
    expect(() =>
      validateBootstrapHrInput({
        email: "hr@example.com",
        password: "short",
        displayName: "HR Manager",
      }),
    ).toThrow(/BOOTSTRAP_HR_PASSWORD/);
  });

  it("rejects whitespace-only passwords", () => {
    expect(() =>
      validateBootstrapHrInput({
        email: "hr@example.com",
        password: "            ",
        displayName: "HR Manager",
      }),
    ).toThrow(/whitespace-only/);
  });
});

describe("bootstrapHrUser", () => {
  it("creates a user when the email is unused", async () => {
    const createUser = vi.fn().mockResolvedValue({
      id: "u1",
      email: "hr@example.com",
      displayName: "HR Manager",
    });
    const hashPassword = vi.fn().mockResolvedValue("hashed");

    const result = await bootstrapHrUser(
      {
        email: "HR@Example.com",
        password: "long-enough-secret",
        displayName: "HR Manager",
      },
      {
        findByEmail: async () => null,
        createUser,
        hashPassword,
      },
    );

    expect(result).toEqual({
      id: "u1",
      email: "hr@example.com",
      displayName: "HR Manager",
    });
    expect(hashPassword).toHaveBeenCalledWith("long-enough-secret");
    expect(createUser).toHaveBeenCalledWith({
      email: "hr@example.com",
      passwordHash: "hashed",
      displayName: "HR Manager",
      isActive: true,
    });
  });

  it("refuses to overwrite an existing account", async () => {
    const createUser = vi.fn();

    await expect(
      bootstrapHrUser(
        {
          email: "hr@example.com",
          password: "long-enough-secret",
          displayName: "HR Manager",
        },
        {
          findByEmail: async () => ({ id: "existing" }),
          createUser,
          hashPassword: async () => "hashed",
        },
      ),
    ).rejects.toThrow(/Refusing to overwrite/);

    expect(createUser).not.toHaveBeenCalled();
  });

  it("passes passwords with intentional leading/trailing spaces unchanged to hashing", async () => {
    const hashPassword = vi.fn().mockResolvedValue("hashed");
    const createUser = vi.fn().mockResolvedValue({
      id: "u2",
      email: "hr@example.com",
      displayName: "HR Manager",
    });
    const password = "  spaced-secret!!  ";

    await bootstrapHrUser(
      {
        email: "hr@example.com",
        password,
        displayName: "HR Manager",
      },
      {
        findByEmail: async () => null,
        createUser,
        hashPassword,
      },
    );

    expect(hashPassword).toHaveBeenCalledTimes(1);
    expect(hashPassword).toHaveBeenCalledWith(password);
    expect(hashPassword.mock.calls[0]![0]).toBe(password);
  });
});
