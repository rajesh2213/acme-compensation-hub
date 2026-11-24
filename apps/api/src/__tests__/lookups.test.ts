import * as argon2 from "argon2";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";

const TRUSTED_ORIGIN = "http://localhost:3000";
const PREFIX = `LK-${Date.now().toString(36)}`;

type AuthUser = { id: string; email: string; password: string };

let hrUser: AuthUser;

async function getCsrf(agent: request.SuperAgentTest) {
  const res = await agent.get("/api/v1/auth/csrf").expect(200);
  return res.body.data.csrfToken as string;
}

async function loginAgent() {
  const app = createApp();
  const agent = request.agent(app);
  const csrf = await getCsrf(agent);
  const login = await agent
    .post("/api/v1/auth/login")
    .set("Origin", TRUSTED_ORIGIN)
    .set("X-CSRF-Token", csrf)
    .send({ email: hrUser.email, password: hrUser.password });
  expect(login.status).toBe(200);
  return agent;
}

beforeAll(async () => {
  const password = "LookupTestPass1!";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email: `hr.${PREFIX.toLowerCase()}@example.test`,
      passwordHash,
      displayName: "Lookup Test HR",
      isActive: true,
    },
  });
  hrUser = { id: user.id, email: user.email, password };
}, 60_000);

afterAll(async () => {
  if (!hrUser) return;
  await prisma.$executeRaw`
    DELETE FROM session WHERE sess->>'userId' = ${hrUser.id}
  `;
  await prisma.user.delete({ where: { id: hrUser.id } });
}, 60_000);

describe("reference lookups", () => {
  it("requires authentication for countries and departments", async () => {
    const app = createApp();
    const countries = await request(app).get("/api/v1/countries");
    const departments = await request(app).get("/api/v1/departments");
    expect(countries.status).toBe(401);
    expect(departments.status).toBe(401);
    expect(countries.body.error.code).toBe("UNAUTHENTICATED");
    expect(departments.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns countries ordered by name with id/code/name only", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/v1/countries").expect(200);

    const countries = res.body.data.countries as Array<{
      id: string;
      code: string;
      name: string;
    }>;
    expect(Array.isArray(countries)).toBe(true);
    expect(countries.length).toBeGreaterThan(0);

    const names = countries.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    for (const country of countries) {
      expect(Object.keys(country).sort()).toEqual(["code", "id", "name"]);
    }
  });

  it("returns departments ordered by name with id/code/name only", async () => {
    const agent = await loginAgent();
    const res = await agent.get("/api/v1/departments").expect(200);

    const departments = res.body.data.departments as Array<{
      id: string;
      code: string;
      name: string;
    }>;
    expect(Array.isArray(departments)).toBe(true);
    expect(departments.length).toBeGreaterThan(0);

    const names = departments.map((d) => d.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    for (const department of departments) {
      expect(Object.keys(department).sort()).toEqual(["code", "id", "name"]);
    }
  });
});
