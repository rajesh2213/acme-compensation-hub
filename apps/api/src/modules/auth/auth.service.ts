import * as argon2 from "argon2";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../lib/errors.js";
import type { SafeUser } from "./auth.types.js";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export function toSafeUser(user: {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
}): SafeUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isActive: user.isActive,
  };
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  let passwordValid = false;
  try {
    passwordValid = await argon2.verify(hash, password);
  } catch {
    passwordValid = false;
  }

  if (!user || !user.isActive || !passwordValid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  return toSafeUser(user);
}

export async function getActiveUserById(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }

  return toSafeUser(user);
}
