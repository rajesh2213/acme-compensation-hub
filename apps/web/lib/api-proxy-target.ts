/**
 * Resolves the Express base URL used by Next.js rewrites for `/api` and `/health`.
 * Server-side only — never expose via NEXT_PUBLIC_*.
 */
export function resolveApiProxyTarget(
  raw: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  const production = (nodeEnv ?? "development") === "production";
  const trimmed = raw?.trim() ?? "";

  if (!production) {
    return trimmed || "http://localhost:4000";
  }

  if (!trimmed) {
    throw new Error(
      "API_PROXY_TARGET is required in production (HTTPS origin of the Render API, e.g. https://acme-api.onrender.com)",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`API_PROXY_TARGET is not a valid URL: ${trimmed}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      `API_PROXY_TARGET must use HTTPS in production (received ${parsed.protocol})`,
    );
  }

  if (parsed.username || parsed.password) {
    throw new Error("API_PROXY_TARGET must not include credentials");
  }

  if (parsed.search || parsed.hash) {
    throw new Error("API_PROXY_TARGET must not include query or hash components");
  }

  // Allow only origin form: https://host[:port] with empty or "/" path.
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error(
      "API_PROXY_TARGET must be an origin only (no path); rewrites append /api and /health",
    );
  }

  return parsed.origin;
}
