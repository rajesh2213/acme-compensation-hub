import * as argon2 from "argon2";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { resetLoginRateLimitStore } from "../middleware/login-rate-limit.js";

const TRUSTED_ORIGIN = "http://localhost:3000";

type TestUser = {
  id: string;
  email: string;
  password: string;
};

async function createUser(options: {
  email: string;
  password: string;
  isActive?: boolean;
  displayName?: string;
}): Promise<TestUser> {
  const passwordHash = await argon2.hash(options.password, {
    type: argon2.argon2id,
  });

  const user = await prisma.user.create({
    data: {
      email: options.email,
      passwordHash,
      displayName: options.displayName ?? "Test HR",
      isActive: options.isActive ?? true,
    },
  });

  return {
    id: user.id,
    email: options.email,
    password: options.password,
  };
}

async function getCsrf(agent: request.SuperAgentTest) {
  const res = await agent.get("/api/v1/auth/csrf").expect(200);
  return res.body.data.csrfToken as string;
}

async function login(
  agent: request.SuperAgentTest,
  user: TestUser,
  csrfToken: string,
) {
  return agent
    .post("/api/v1/auth/login")
    .set("Origin", TRUSTED_ORIGIN)
    .set("X-CSRF-Token", csrfToken)
    .send({ email: user.email, password: user.password });
}

describe("auth + session + CSRF", () => {
  const createdUserIds: string[] = [];
  let activeUser: TestUser;
  let inactiveUser: TestUser;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    activeUser = await createUser({
      email: `active.${suffix}@example.test`,
      password: "CorrectHorseBattery1!",
    });
    inactiveUser = await createUser({
      email: `inactive.${suffix}@example.test`,
      password: "CorrectHorseBattery1!",
      isActive: false,
    });
    createdUserIds.push(activeUser.id, inactiveUser.id);
  });

  afterEach(() => {
    resetLoginRateLimitStore();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    await prisma.$disconnect();
  });

  it("logs in successfully and returns a safe user profile", async () => {
    const app = createApp();
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);

    const res = await login(agent, activeUser, csrf);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      id: activeUser.id,
      email: activeUser.email,
      displayName: "Test HR",
      isActive: true,
    });
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain("password");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("$argon2");
  });

  it("rejects invalid password and unknown email with the same generic error", async () => {
    const app = createApp();
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);

    const badPassword = await agent
      .post("/api/v1/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({ email: activeUser.email, password: "wrong-password" });

    const unknownEmail = await agent
      .post("/api/v1/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({ email: "missing@example.test", password: "whatever" });

    expect(badPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(badPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmail.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(badPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it("rejects inactive users without revealing account state", async () => {
    const app = createApp();
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);

    const res = await login(agent, inactiveUser, csrf);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("regenerates the session on login and persists auth across requests", async () => {
    const app = createApp();
    const agent = request.agent(app);

    const before = await agent.get("/api/v1/auth/csrf");
    const preLoginCookie = before.headers["set-cookie"]?.[0] ?? "";
    const csrf = before.body.data.csrfToken as string;

    const loginRes = await login(agent, activeUser, csrf);
    expect(loginRes.status).toBe(200);

    const postLoginCookie = loginRes.headers["set-cookie"]?.[0] ?? "";
    expect(postLoginCookie).toBeTruthy();
    if (preLoginCookie && postLoginCookie) {
      expect(postLoginCookie).not.toEqual(preLoginCookie);
    }

    const me = await agent.get("/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(activeUser.id);
  });

  it("requires authentication for /auth/me", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("logs out, destroys the session, and blocks /auth/me afterward", async () => {
    const app = createApp();
    const agent = request.agent(app);
    const loginCsrf = await getCsrf(agent);
    const loginRes = await login(agent, activeUser, loginCsrf);
    expect(loginRes.status).toBe(200);

    const logoutCsrf = await getCsrf(agent);
    const logout = await agent
      .post("/api/v1/auth/logout")
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", logoutCsrf);

    expect(logout.status).toBe(200);
    expect(logout.body.data).toEqual({ loggedOut: true });

    const me = await agent.get("/api/v1/auth/me");
    expect(me.status).toBe(401);
  });

  it("issues CSRF tokens without exposing the session id", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/auth/csrf").expect(200);

    expect(typeof res.body.data.csrfToken).toBe("string");
    expect(res.body.data.csrfToken.length).toBeGreaterThan(20);
    expect(JSON.stringify(res.body)).not.toMatch(/acme\.sid|connect\.sid/i);
    expect(res.body.data.sessionId).toBeUndefined();
  });

  it("rejects missing and invalid CSRF tokens on login", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await getCsrf(agent);

    const missing = await agent
      .post("/api/v1/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ email: activeUser.email, password: activeUser.password });

    const invalid = await agent
      .post("/api/v1/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", "deadbeef")
      .send({ email: activeUser.email, password: activeUser.password });

    expect(missing.status).toBe(403);
    expect(invalid.status).toBe(403);
    expect(missing.body.error.code).toBe("CSRF_TOKEN_INVALID");
    expect(invalid.body.error.code).toBe("CSRF_TOKEN_INVALID");
  });

  it("rejects untrusted origins on state-changing requests", async () => {
    const app = createApp();
    const agent = request.agent(app);
    const csrf = await getCsrf(agent);

    const res = await agent
      .post("/api/v1/auth/login")
      .set("Origin", "https://evil.example")
      .set("X-CSRF-Token", csrf)
      .send({ email: activeUser.email, password: activeUser.password });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ORIGIN_FORBIDDEN");
  });

  it("rate limits repeated login attempts", async () => {
    const app = createApp();
    const agent = request.agent(app);
    const targetEmail = `rate.${Date.now()}@example.test`;

    let saw429 = false;
    for (let i = 0; i < 12; i += 1) {
      const csrf = await getCsrf(agent);
      const res = await agent
        .post("/api/v1/auth/login")
        .set("Origin", TRUSTED_ORIGIN)
        .set("X-CSRF-Token", csrf)
        .send({ email: targetEmail, password: "nope" });

      if (res.status === 429) {
        saw429 = true;
        expect(res.body.error.code).toBe("RATE_LIMITED");
        break;
      }
    }

    expect(saw429).toBe(true);
  });

  it("applies login rate limiting per client IP across different emails", async () => {
    const app = createApp();
    const agent = request.agent(app);
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    let saw429 = false;
    for (let i = 0; i < 12; i += 1) {
      const csrf = await getCsrf(agent);
      const res = await agent
        .post("/api/v1/auth/login")
        .set("Origin", TRUSTED_ORIGIN)
        .set("X-CSRF-Token", csrf)
        .send({
          email: `rate-ip.${stamp}.${i}@example.test`,
          password: "nope",
        });

      if (res.status === 429) {
        saw429 = true;
        expect(res.body.error.code).toBe("RATE_LIMITED");
        break;
      }
    }

    expect(saw429).toBe(true);
  });

  it("rejects /auth/me with an existing session after the user is deactivated", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const user = await createUser({
      email: `deactivate.${suffix}@example.test`,
      password: "CorrectHorseBattery1!",
      isActive: true,
    });
    createdUserIds.push(user.id);

    try {
      const app = createApp();
      const agent = request.agent(app);
      const csrf = await getCsrf(agent);
      const loginRes = await login(agent, user, csrf);
      expect(loginRes.status).toBe(200);

      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });

      const me = await agent.get("/api/v1/auth/me");
      expect(me.status).toBe(401);
      expect(me.body.error.code).toBe("UNAUTHENTICATED");
    } finally {
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });
});
