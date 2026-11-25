import { afterEach, describe, expect, it } from "vitest";
import { resolveApiProxyTarget } from "./api-proxy-target";

describe("resolveApiProxyTarget", () => {
  afterEach(() => {
    // no env mutation in these tests — values passed explicitly
  });

  it("falls back to localhost in development when unset", () => {
    expect(resolveApiProxyTarget(undefined, "development")).toBe(
      "http://localhost:4000",
    );
    expect(resolveApiProxyTarget("", "development")).toBe(
      "http://localhost:4000",
    );
  });

  it("allows http override in development", () => {
    expect(resolveApiProxyTarget("http://127.0.0.1:4000", "development")).toBe(
      "http://127.0.0.1:4000",
    );
  });

  it("requires API_PROXY_TARGET in production", () => {
    expect(() => resolveApiProxyTarget(undefined, "production")).toThrow(
      /required in production/i,
    );
    expect(() => resolveApiProxyTarget("   ", "production")).toThrow(
      /required in production/i,
    );
  });

  it("accepts a valid HTTPS origin in production", () => {
    expect(
      resolveApiProxyTarget("https://acme-api.onrender.com", "production"),
    ).toBe("https://acme-api.onrender.com");
    expect(
      resolveApiProxyTarget("https://acme-api.onrender.com/", "production"),
    ).toBe("https://acme-api.onrender.com");
  });

  it("rejects non-HTTPS, credentials, path, query, and hash in production", () => {
    expect(() =>
      resolveApiProxyTarget("http://acme-api.onrender.com", "production"),
    ).toThrow(/HTTPS/i);
    expect(() =>
      resolveApiProxyTarget(
        "https://user:pass@acme-api.onrender.com",
        "production",
      ),
    ).toThrow(/credentials/i);
    expect(() =>
      resolveApiProxyTarget("https://acme-api.onrender.com/api", "production"),
    ).toThrow(/origin only/i);
    expect(() =>
      resolveApiProxyTarget(
        "https://acme-api.onrender.com?x=1",
        "production",
      ),
    ).toThrow(/query or hash/i);
    expect(() =>
      resolveApiProxyTarget(
        "https://acme-api.onrender.com#frag",
        "production",
      ),
    ).toThrow(/query or hash/i);
    expect(() => resolveApiProxyTarget("not-a-url", "production")).toThrow(
      /valid URL/i,
    );
  });
});
