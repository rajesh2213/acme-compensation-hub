import * as argon2 from "argon2";

export type BootstrapHrInput = {
  email: string;
  password: string;
  displayName: string;
};

export type BootstrapHrResult = {
  id: string;
  email: string;
  displayName: string;
};

export type BootstrapHrDeps = {
  findByEmail: (email: string) => Promise<{ id: string } | null>;
  createUser: (data: {
    email: string;
    passwordHash: string;
    displayName: string;
    isActive: boolean;
  }) => Promise<BootstrapHrResult>;
  hashPassword?: (password: string) => Promise<string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBootstrapHrInput(input: BootstrapHrInput): void {
  const email = input.email.trim();
  if (!email || !EMAIL_RE.test(email)) {
    throw new Error("BOOTSTRAP_HR_EMAIL must be a valid email address");
  }
  // Password is never trimmed — spaces are significant. Reject missing/whitespace-only.
  if (typeof input.password !== "string" || input.password.trim().length === 0) {
    throw new Error(
      "BOOTSTRAP_HR_PASSWORD must not be empty or whitespace-only",
    );
  }
  if (input.password.length < 12) {
    throw new Error("BOOTSTRAP_HR_PASSWORD must be at least 12 characters");
  }
  if (!input.displayName.trim()) {
    throw new Error("BOOTSTRAP_HR_DISPLAY_NAME must not be empty");
  }
}

async function defaultHash(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/**
 * Creates the first HR user. Refuses to overwrite an existing account with the same email.
 * Does not invoke the development seed.
 */
export async function bootstrapHrUser(
  input: BootstrapHrInput,
  deps: BootstrapHrDeps,
): Promise<BootstrapHrResult> {
  validateBootstrapHrInput(input);

  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();

  const existing = await deps.findByEmail(email);
  if (existing) {
    throw new Error(
      `HR account already exists for email: ${email}. Refusing to overwrite.`,
    );
  }

  const hashPassword = deps.hashPassword ?? defaultHash;
  const passwordHash = await hashPassword(input.password);

  return deps.createUser({
    email,
    passwordHash,
    displayName,
    isActive: true,
  });
}
