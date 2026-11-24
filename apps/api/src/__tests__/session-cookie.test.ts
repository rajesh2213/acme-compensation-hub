import { describe, expect, it } from "vitest";
import {
  getSessionCookieClearOptions,
  getSessionCookieOptions,
} from "../middleware/session.js";

describe("session cookie options", () => {
  it("matches issued and clear options in development (secure=false)", () => {
    const issued = getSessionCookieOptions({
      cookieSecure: false,
      sessionTtlSeconds: 28800,
    });
    const cleared = getSessionCookieClearOptions({ cookieSecure: false });

    expect(issued.httpOnly).toBe(true);
    expect(issued.secure).toBe(false);
    expect(issued.sameSite).toBe("lax");
    expect(issued.path).toBe("/");
    expect(issued.maxAge).toBe(28800 * 1000);

    expect(cleared).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  });

  it("matches issued and clear options in production (secure=true)", () => {
    const issued = getSessionCookieOptions({
      cookieSecure: true,
      sessionTtlSeconds: 3600,
    });
    const cleared = getSessionCookieClearOptions({ cookieSecure: true });

    expect(issued.secure).toBe(true);
    expect(cleared.secure).toBe(true);
    expect(cleared.httpOnly).toBe(issued.httpOnly);
    expect(cleared.sameSite).toBe(issued.sameSite);
    expect(cleared.path).toBe(issued.path);
  });
});
