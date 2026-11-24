import { apiRequest } from "@/lib/api-client";
import type { AuthUser } from "./types";

export async function fetchCsrfToken(signal?: AbortSignal): Promise<string> {
  const data = await apiRequest<{ csrfToken: string }>("/api/v1/auth/csrf", {
    signal,
  });
  return data.csrfToken;
}

export async function fetchCurrentUser(
  signal?: AbortSignal,
): Promise<AuthUser | null> {
  try {
    const data = await apiRequest<{ user: AuthUser }>("/api/v1/auth/me", {
      signal,
    });
    return data.user;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status: number }).status === 401
    ) {
      return null;
    }
    throw error;
  }
}

export async function loginRequest(
  email: string,
  password: string,
  csrfToken: string,
): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>("/api/v1/auth/login", {
    method: "POST",
    csrfToken,
    body: { email, password },
  });
  return data.user;
}

export async function logoutRequest(csrfToken: string): Promise<void> {
  await apiRequest<{ loggedOut: boolean }>("/api/v1/auth/logout", {
    method: "POST",
    csrfToken,
  });
}
