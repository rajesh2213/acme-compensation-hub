import { describe, expect, it } from "vitest";
import { resolvePostLoginPath } from "./safe-next-path";

describe("resolvePostLoginPath", () => {
  it("allows a valid internal path", () => {
    expect(resolvePostLoginPath("/employees")).toBe("/employees");
  });

  it("allows an internal path with query parameters", () => {
    expect(resolvePostLoginPath("/employees?countryId=c1&page=2")).toBe(
      "/employees?countryId=c1&page=2",
    );
  });

  it("falls back when next is missing", () => {
    expect(resolvePostLoginPath(null)).toBe("/overview");
    expect(resolvePostLoginPath(undefined)).toBe("/overview");
    expect(resolvePostLoginPath("")).toBe("/overview");
  });

  it("rejects external absolute URLs", () => {
    expect(resolvePostLoginPath("https://evil.example/phish")).toBe("/overview");
    expect(resolvePostLoginPath("http://evil.example")).toBe("/overview");
  });

  it("rejects protocol-relative URLs", () => {
    expect(resolvePostLoginPath("//evil.example/x")).toBe("/overview");
  });

  it("avoids redirect loops to /login", () => {
    expect(resolvePostLoginPath("/login")).toBe("/overview");
    expect(resolvePostLoginPath("/login?next=/employees")).toBe("/overview");
    expect(resolvePostLoginPath("/login/extra")).toBe("/overview");
  });

  it("rejects malformed or unsafe input", () => {
    expect(resolvePostLoginPath("employees")).toBe("/overview");
    expect(resolvePostLoginPath("\\employees")).toBe("/overview");
    // Encoded path segments decode; still a same-app relative path.
    expect(resolvePostLoginPath("/%2e%2e/secret")).toBe("/../secret");
    expect(resolvePostLoginPath("%E0%A4%A")).toBe("/overview");
    expect(resolvePostLoginPath("/employees\u0000")).toBe("/overview");
  });
});
