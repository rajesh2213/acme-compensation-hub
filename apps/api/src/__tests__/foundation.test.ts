import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApp } from "../app.js";
import { AppError } from "../lib/errors.js";
import { asyncHandler } from "../lib/async-handler.js";
import { sendSuccess } from "../lib/response.js";
import { validate } from "../middleware/validate.js";

vi.mock("../db/prisma.js", () => ({
  checkDatabaseConnectivity: vi.fn(),
  prisma: {},
}));

import { checkDatabaseConnectivity } from "../db/prisma.js";

const mockedConnectivity = vi.mocked(checkDatabaseConnectivity);

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.NODE_ENV;
});

describe("API foundation", () => {
  it("returns successful responses in the { data } convention", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        name: "acme-compensation-hub-api",
        version: "v1",
      },
    });
  });

  it("maps AppError to the error convention", async () => {
    const app = createApp({
      configure: (expressApp) => {
        expressApp.get("/api/v1/__test/app-error", (_req, _res, next) => {
          next(
            new AppError(409, "CONFLICT", "Resource conflict", {
              field: "example",
            }),
          );
        });
      },
    });

    const res = await request(app).get("/api/v1/__test/app-error");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.message).toBe("Resource conflict");
    expect(res.body.error.details).toEqual({ field: "example" });
    expect(res.body.error.requestId).toEqual(res.headers["x-request-id"]);
    expect(res.body.error.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("returns NOT_FOUND for unknown routes", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.requestId).toBeTruthy();
  });

  it("returns VALIDATION_ERROR for Zod failures", async () => {
    const app = createApp({
      configure: (expressApp) => {
        expressApp.post(
          "/api/v1/__test/validate",
          validate({
            body: z.object({
              email: z.string().email(),
            }),
          }),
          (req, res) => {
            sendSuccess(res, req.body);
          },
        );
      },
    });

    const agent = request.agent(app);
    const csrfRes = await agent.get("/api/v1/auth/csrf");
    const csrfToken = csrfRes.body.data.csrfToken as string;

    const res = await agent
      .post("/api/v1/__test/validate")
      .set("Origin", "http://localhost:3000")
      .set("X-CSRF-Token", csrfToken)
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toBe("Request validation failed");
    expect(res.body.error.details).toBeTruthy();
  });

  it("preserves validated and transformed values", async () => {
    const app = createApp({
      configure: (expressApp) => {
        expressApp.get(
          "/api/v1/__test/query",
          validate({
            query: z.object({
              page: z.coerce.number().int().positive(),
            }),
          }),
          (req, res) => {
            sendSuccess(res, { page: req.query.page, pageType: typeof req.query.page });
          },
        );
      },
    });

    const res = await request(app).get("/api/v1/__test/query?page=2");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ page: 2, pageType: "number" });
  });

  it("hides unexpected error details in production", async () => {
    process.env.NODE_ENV = "production";

    const app = createApp({
      configure: (expressApp) => {
        expressApp.get(
          "/api/v1/__test/boom",
          asyncHandler(async () => {
            throw new Error("secret database connection string");
          }),
        );
      },
    });

    const res = await request(app).get("/api/v1/__test/boom");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(res.body.error.message).toBe("An unexpected error occurred");
    expect(JSON.stringify(res.body)).not.toContain("secret database");
    expect(res.body.error.details).toBeUndefined();
  });

  it("hides non-exposed AppError message and details while keeping status", async () => {
    const app = createApp({
      configure: (expressApp) => {
        expressApp.get("/api/v1/__test/hidden-error", (_req, _res, next) => {
          next(
            new AppError(
              500,
              "UPSTREAM_FAILURE",
              "postgres connection password=super-secret",
              { connectionString: "postgresql://user:secret@localhost/db" },
              { expose: false },
            ),
          );
        });
      },
    });

    const res = await request(app).get("/api/v1/__test/hidden-error");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("UPSTREAM_FAILURE");
    expect(res.body.error.message).toBe("An unexpected error occurred");
    expect(res.body.error.details).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("super-secret");
    expect(JSON.stringify(res.body)).not.toContain("connectionString");
    expect(res.body.error.requestId).toEqual(res.headers["x-request-id"]);
  });

  it("returns exposed 4xx AppError message and details", async () => {
    const app = createApp({
      configure: (expressApp) => {
        expressApp.get("/api/v1/__test/exposed-error", (_req, _res, next) => {
          next(
            new AppError(422, "UNPROCESSABLE_ENTITY", "Invalid salary amount", {
              field: "amount",
            }),
          );
        });
      },
    });

    const res = await request(app).get("/api/v1/__test/exposed-error");

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("UNPROCESSABLE_ENTITY");
    expect(res.body.error.message).toBe("Invalid salary amount");
    expect(res.body.error.details).toEqual({ field: "amount" });
    expect(res.body.error.requestId).toEqual(res.headers["x-request-id"]);
  });

  it("maps malformed JSON to INVALID_JSON", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/v1")
      .set("Content-Type", "application/json")
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
    expect(res.body.error.message).toBe("Request body contains invalid JSON");
    expect(res.body.error.details).toBeUndefined();
    expect(res.body.error.requestId).toEqual(res.headers["x-request-id"]);
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain("syntaxerror");
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain("entity.parse");
  });

  it("maps oversized JSON to PAYLOAD_TOO_LARGE", async () => {
    const app = createApp();
    const oversized = `{"blob":"${"a".repeat(1_100_000)}"}`;

    const res = await request(app)
      .post("/api/v1")
      .set("Content-Type", "application/json")
      .send(oversized);

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(res.body.error.message).toBe("Request body is too large");
    expect(res.body.error.details).toBeUndefined();
    expect(res.body.error.requestId).toEqual(res.headers["x-request-id"]);
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain("entity.too.large");
  });

  it("assigns and returns a request id header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1");

    expect(res.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("accepts a valid client request id and ignores invalid ones", async () => {
    const app = createApp();
    const valid = "11111111-2222-4333-a444-555555555555";

    const accepted = await request(app)
      .get("/api/v1")
      .set("X-Request-Id", valid);
    expect(accepted.headers["x-request-id"]).toBe(valid);

    const rejected = await request(app)
      .get("/api/v1")
      .set("X-Request-Id", "not-a-uuid");
    expect(rejected.headers["x-request-id"]).not.toBe("not-a-uuid");
    expect(rejected.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("keeps /health as a lightweight liveness probe", async () => {
    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(mockedConnectivity).not.toHaveBeenCalled();
  });

  it("returns ready/unavailable for /health/ready without leaking internals", async () => {
    mockedConnectivity.mockResolvedValueOnce(true);
    const app = createApp();

    const ready = await request(app).get("/health/ready");
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: "ready" });

    mockedConnectivity.mockResolvedValueOnce(false);
    const unavailable = await request(app).get("/health/ready");
    expect(unavailable.status).toBe(503);
    expect(unavailable.body).toEqual({ status: "unavailable" });
    expect(JSON.stringify(unavailable.body).toLowerCase()).not.toContain("password");
    expect(JSON.stringify(unavailable.body).toLowerCase()).not.toContain("database_url");
  });
});
