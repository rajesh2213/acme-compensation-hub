import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "./api-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiRequest", () => {
  it("parses { data } success envelopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: { csrfToken: "abc" } }),
      }),
    );

    await expect(apiRequest<{ csrfToken: string }>("/api/v1/auth/csrf")).resolves.toEqual({
      csrfToken: "abc",
    });
  });

  it("parses { error } failure envelopes into ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
            requestId: "req-1",
          },
        }),
      }),
    );

    await expect(
      apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: { email: "a", password: "b" },
        csrfToken: "token",
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
      requestId: "req-1",
    } satisfies Partial<ApiError>);
  });

  it("maps network failures to NETWORK_ERROR", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(apiRequest("/api/v1/auth/me")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    });
  });

  it("sends credentials and CSRF header for mutating requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ data: { ok: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/api/v1/auth/logout", {
      method: "POST",
      csrfToken: "csrf-123",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          "X-CSRF-Token": "csrf-123",
        }),
      }),
    );
  });
});
