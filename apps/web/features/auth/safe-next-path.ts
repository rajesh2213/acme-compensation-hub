const FALLBACK = "/overview";

/**
 * Resolves a safe same-app path from the login `next` query value.
 * Rejects open redirects: external URLs, protocol-relative, login loops, etc.
 */
export function resolvePostLoginPath(
  next: string | null | undefined,
  fallback: string = FALLBACK,
): string {
  if (next == null) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(next.trim());
  } catch {
    return fallback;
  }

  if (!decoded) return fallback;

  // Must be a single-slash relative path (not //host, not absolute URL).
  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return fallback;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
    return fallback;
  }

  // Block backslash tricks and control characters.
  if (decoded.includes("\\") || /[\u0000-\u001F\u007F]/.test(decoded)) {
    return fallback;
  }

  const pathOnly = decoded.split(/[?#]/, 1)[0] ?? "";
  if (pathOnly === "/login" || pathOnly.startsWith("/login/")) {
    return fallback;
  }

  return decoded;
}
