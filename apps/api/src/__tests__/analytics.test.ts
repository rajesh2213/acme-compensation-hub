import * as argon2 from "argon2";
import { Prisma } from "../generated/prisma/client.js";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { resetLoginRateLimitStore } from "../middleware/login-rate-limit.js";

const TRUSTED_ORIGIN = "http://localhost:3000";
const PREFIX = `A410-${Date.now().toString(36)}`;

type AuthUser = { id: string; email: string; password: string };

let hrUser: AuthUser;
let countryAId: string;
let countryBId: string;
let emptyCountryId: string;
let deptAId: string;
let deptBId: string;
let employeeIds: string[] = [];

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
  const password = "AnalyticsTestPass1!";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email: `hr.${PREFIX.toLowerCase()}@example.test`,
      passwordHash,
      displayName: "Analytics Test HR",
      isActive: true,
    },
  });
  hrUser = { id: user.id, email: user.email, password };

  const [countryA, countryB, emptyCountry, deptA, deptB] = await Promise.all([
    prisma.country.create({ data: { code: "YA", name: `${PREFIX} Country A` } }),
    prisma.country.create({ data: { code: "YB", name: `${PREFIX} Country B` } }),
    prisma.country.create({ data: { code: "YE", name: `${PREFIX} Empty` } }),
    prisma.department.create({
      data: { code: `${PREFIX}-DA`, name: `${PREFIX} Dept A` },
    }),
    prisma.department.create({
      data: { code: `${PREFIX}-DB`, name: `${PREFIX} Dept B` },
    }),
  ]);
  countryAId = countryA.id;
  countryBId = countryB.id;
  emptyCountryId = emptyCountry.id;
  deptAId = deptA.id;
  deptBId = deptB.id;

  const fixtures: Array<{
    suffix: string;
    status: "ACTIVE" | "INACTIVE" | "TERMINATED";
    countryId: string;
    departmentId: string;
    salary?: { amount: string; currency: string };
  }> = [
    {
      suffix: "A1",
      status: "ACTIVE",
      countryId: countryAId,
      departmentId: deptAId,
      salary: { amount: "100000.00", currency: "USD" },
    },
    {
      suffix: "A2",
      status: "ACTIVE",
      countryId: countryAId,
      departmentId: deptAId,
      salary: { amount: "120000.00", currency: "USD" },
    },
    {
      suffix: "A3",
      status: "INACTIVE",
      countryId: countryAId,
      departmentId: deptBId,
      salary: { amount: "90000.00", currency: "EUR" },
    },
    {
      suffix: "B1",
      status: "ACTIVE",
      countryId: countryBId,
      departmentId: deptBId,
      salary: { amount: "80000.00", currency: "EUR" },
    },
    {
      suffix: "B2",
      status: "TERMINATED",
      countryId: countryBId,
      departmentId: deptAId,
      salary: { amount: "70000.00", currency: "USD" },
    },
    {
      suffix: "NOSAL",
      status: "ACTIVE",
      countryId: countryBId,
      departmentId: deptAId,
    },
  ];

  for (const fixture of fixtures) {
    const employee = await prisma.employee.create({
      data: {
        employeeNumber: `${PREFIX}-${fixture.suffix}`,
        firstName: "Analytics",
        lastName: fixture.suffix,
        jobTitle: "Software Engineer",
        countryId: fixture.countryId,
        departmentId: fixture.departmentId,
        status: fixture.status,
        hireDate: new Date("2021-01-01"),
      },
    });
    employeeIds.push(employee.id);

    if (fixture.salary) {
      await prisma.salary.create({
        data: {
          employeeId: employee.id,
          amount: new Prisma.Decimal(fixture.salary.amount),
          currency: fixture.salary.currency,
          effectiveDate: new Date("2024-01-01"),
          version: 1,
        },
      });
    }
  }
});

afterEach(() => {
  resetLoginRateLimitStore();
});

afterAll(async () => {
  // Remove express-session rows created by loginAgent for this test HR user.
  await prisma.$executeRaw`
    DELETE FROM session WHERE sess->>'userId' = ${hrUser.id}
  `;
  await prisma.salaryRevision.deleteMany({
    where: { salary: { employeeId: { in: employeeIds } } },
  });
  await prisma.salary.deleteMany({
    where: { employeeId: { in: employeeIds } },
  });
  await prisma.employee.deleteMany({
    where: { id: { in: employeeIds } },
  });
  await prisma.department.deleteMany({
    where: { id: { in: [deptAId, deptBId] } },
  });
  await prisma.country.deleteMany({
    where: { id: { in: [countryAId, countryBId, emptyCountryId] } },
  });
  await prisma.user.deleteMany({ where: { id: hrUser.id } });
  await prisma.$disconnect();
});

describe("analytics API — overview", () => {
  it("returns correct headcount totals and status breakdown for fixture scope", async () => {
    const agent = await loginAgent();
    const resA = await agent
      .get("/api/v1/analytics/overview")
      .query({ departmentId: deptAId });
    const resB = await agent
      .get("/api/v1/analytics/overview")
      .query({ departmentId: deptBId });

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // Dept A: A1 ACTIVE, A2 ACTIVE, B2 TERMINATED, NOSAL ACTIVE => 4
    expect(resA.body.data.totalEmployees).toBe(4);
    expect(resA.body.data.activeEmployees).toBe(3);
    expect(resA.body.data.inactiveEmployees).toBe(0);
    expect(resA.body.data.terminatedEmployees).toBe(1);

    // Dept B: A3 INACTIVE, B1 ACTIVE => 2
    expect(resB.body.data.totalEmployees).toBe(2);
    expect(resB.body.data.activeEmployees).toBe(1);
    expect(resB.body.data.inactiveEmployees).toBe(1);
    expect(resB.body.data.terminatedEmployees).toBe(0);
  });

  it("returns country and department distributions", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/v1/analytics/overview")
      .query({ countryId: countryAId });

    expect(res.status).toBe(200);
    expect(res.body.data.totalEmployees).toBe(3);
    expect(res.body.data.byCountry).toEqual([
      {
        id: countryAId,
        name: `${PREFIX} Country A`,
        employeeCount: 3,
      },
    ]);
    const deptCounts = Object.fromEntries(
      res.body.data.byDepartment.map(
        (d: { id: string; employeeCount: number }) => [d.id, d.employeeCount],
      ),
    );
    expect(deptCounts[deptAId]).toBe(2);
    expect(deptCounts[deptBId]).toBe(1);
  });

  it("returns empty distributions for filters with no matching employees", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/v1/analytics/overview")
      .query({ countryId: emptyCountryId });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalEmployees: 0,
      activeEmployees: 0,
      inactiveEmployees: 0,
      terminatedEmployees: 0,
      byCountry: [],
      byDepartment: [],
    });
  });
});

describe("analytics API — compensation", () => {
  it("computes salary statistics grouped by currency", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/v1/analytics/compensation")
      .query({ departmentId: deptAId });

    expect(res.status).toBe(200);
    // Dept A salaried: A1 100000 USD, A2 120000 USD, B2 70000 USD (NOSAL excluded)
    const byCurrency = res.body.data.byCurrency as Array<{
      currency: string;
      employeeCount: number;
      totalAnnualPayroll: string;
      averageAnnualSalary: string;
      minimumAnnualSalary: string;
      maximumAnnualSalary: string;
    }>;

    expect(byCurrency).toHaveLength(1);
    expect(byCurrency[0]).toMatchObject({
      currency: "USD",
      employeeCount: 3,
      totalAnnualPayroll: "290000.00",
      averageAnnualSalary: "96666.67",
      minimumAnnualSalary: "70000.00",
      maximumAnnualSalary: "120000.00",
    });
  });

  it("keeps multiple currencies separated and excludes employees without salaries", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/v1/analytics/compensation")
      .query({ countryId: countryAId });

    expect(res.status).toBe(200);
    // Country A: A1/A2 USD, A3 EUR — 3 employees total in overview but only 3 with salary
    // (all have salaries in country A). Currencies separated.
    const currencies = res.body.data.byCurrency.map(
      (r: { currency: string }) => r.currency,
    );
    expect(currencies).toEqual(["EUR", "USD"]);

    const usd = res.body.data.byCurrency.find(
      (r: { currency: string }) => r.currency === "USD",
    );
    const eur = res.body.data.byCurrency.find(
      (r: { currency: string }) => r.currency === "EUR",
    );
    expect(usd).toMatchObject({
      employeeCount: 2,
      totalAnnualPayroll: "220000.00",
      averageAnnualSalary: "110000.00",
      minimumAnnualSalary: "100000.00",
      maximumAnnualSalary: "120000.00",
    });
    expect(eur).toMatchObject({
      employeeCount: 1,
      totalAnnualPayroll: "90000.00",
      averageAnnualSalary: "90000.00",
      minimumAnnualSalary: "90000.00",
      maximumAnnualSalary: "90000.00",
    });

    // Country B includes NOSAL without salary — compensation employeeCount for B
    const resB = await agent
      .get("/api/v1/analytics/compensation")
      .query({ countryId: countryBId });
    const overviewB = await agent
      .get("/api/v1/analytics/overview")
      .query({ countryId: countryBId });

    expect(overviewB.body.data.totalEmployees).toBe(3); // B1, B2, NOSAL
    const paidCount = resB.body.data.byCurrency.reduce(
      (sum: number, row: { employeeCount: number }) => sum + row.employeeCount,
      0,
    );
    expect(paidCount).toBe(2); // NOSAL excluded
  });

  it("returns country and department compensation breakdowns by currency", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/v1/analytics/compensation")
      .query({ countryId: countryAId });

    expect(res.status).toBe(200);
    expect(
      res.body.data.byCountryAndCurrency.every(
        (row: { countryId: string }) => row.countryId === countryAId,
      ),
    ).toBe(true);
    expect(res.body.data.byCountryAndCurrency).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          countryId: countryAId,
          countryName: `${PREFIX} Country A`,
          currency: "USD",
          employeeCount: 2,
          totalAnnualPayroll: "220000.00",
        }),
        expect.objectContaining({
          countryId: countryAId,
          currency: "EUR",
          employeeCount: 1,
          totalAnnualPayroll: "90000.00",
        }),
      ]),
    );

    expect(
      res.body.data.byDepartmentAndCurrency.some(
        (row: { departmentId: string; currency: string; employeeCount: number }) =>
          row.departmentId === deptAId &&
          row.currency === "USD" &&
          row.employeeCount === 2,
      ),
    ).toBe(true);
  });

  it("applies status filters consistently", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/v1/analytics/compensation")
      .query({ status: "ACTIVE", departmentId: deptAId });

    expect(res.status).toBe(200);
    expect(res.body.data.byCurrency).toEqual([
      expect.objectContaining({
        currency: "USD",
        employeeCount: 2,
        totalAnnualPayroll: "220000.00",
      }),
    ]);
  });

  it("returns empty compensation aggregates when no salaries match", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/v1/analytics/compensation")
      .query({ countryId: emptyCountryId });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      byCurrency: [],
      byCountryAndCurrency: [],
      byDepartmentAndCurrency: [],
    });
  });
});

describe("analytics API — validation and auth", () => {
  it("rejects invalid filter values", async () => {
    const agent = await loginAgent();

    const badUuid = await agent
      .get("/api/v1/analytics/overview")
      .query({ countryId: "not-a-uuid" });
    expect(badUuid.status).toBe(400);
    expect(badUuid.body.error.code).toBe("VALIDATION_ERROR");

    const badStatus = await agent
      .get("/api/v1/analytics/compensation")
      .query({ status: "UNKNOWN" });
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const app = createApp();
    const overview = await request(app).get("/api/v1/analytics/overview");
    const compensation = await request(app).get("/api/v1/analytics/compensation");

    expect(overview.status).toBe(401);
    expect(overview.body.error.code).toBe("UNAUTHENTICATED");
    expect(compensation.status).toBe(401);
    expect(compensation.body.error.code).toBe("UNAUTHENTICATED");
  });
});
