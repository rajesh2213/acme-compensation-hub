import * as argon2 from "argon2";
import { Prisma } from "../generated/prisma/client.js";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { resetLoginRateLimitStore } from "../middleware/login-rate-limit.js";
import { assignSalary } from "../modules/salaries/salaries.service.js";

const TRUSTED_ORIGIN = "http://localhost:3000";
const PREFIX = `S49-${Date.now().toString(36)}`;

type AuthUser = { id: string; email: string; password: string };

let hrUser: AuthUser;
let departmentId: string;
let countryId: string;
let employeeNoSalaryId: string;
let employeeWithSalaryId: string;
let employeeConcurrencyId: string;
let employeeIds: string[] = [];
let salaryIds: string[] = [];

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
  const password = "SalaryTestPass1!";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email: `hr.${PREFIX.toLowerCase()}@example.test`,
      passwordHash,
      displayName: "Salary Test HR",
      isActive: true,
    },
  });
  hrUser = { id: user.id, email: user.email, password };

  const [department, country] = await Promise.all([
    prisma.department.create({
      data: { code: `${PREFIX}-D`, name: `${PREFIX} Dept` },
    }),
    prisma.country.create({
      data: { code: "XC", name: `${PREFIX} Country` },
    }),
  ]);
  departmentId = department.id;
  countryId = country.id;

  const makeEmployee = async (suffix: string) => {
    const row = await prisma.employee.create({
      data: {
        employeeNumber: `${PREFIX}-${suffix}`,
        firstName: "Salary",
        lastName: suffix,
        jobTitle: "Software Engineer",
        departmentId,
        countryId,
        status: "ACTIVE",
        hireDate: new Date("2020-01-01"),
      },
    });
    employeeIds.push(row.id);
    return row.id;
  };

  employeeNoSalaryId = await makeEmployee("NOSAL");
  employeeWithSalaryId = await makeEmployee("HASAL");
  employeeConcurrencyId = await makeEmployee("CONC");

  const seeded = await prisma.salary.create({
    data: {
      employeeId: employeeWithSalaryId,
      amount: new Prisma.Decimal("80000.00"),
      currency: "USD",
      effectiveDate: new Date("2023-01-01"),
      version: 1,
    },
  });
  salaryIds.push(seeded.id);
  await prisma.salaryRevision.create({
    data: {
      salaryId: seeded.id,
      previousAmount: null,
      previousCurrency: null,
      newAmount: new Prisma.Decimal("80000.00"),
      newCurrency: "USD",
      effectiveDate: new Date("2023-01-01"),
      changedByUserId: hrUser.id,
    },
  });
});

afterEach(() => {
  resetLoginRateLimitStore();
});

afterAll(async () => {
  await prisma.salaryRevision.deleteMany({
    where: { salary: { employeeId: { in: employeeIds } } },
  });
  await prisma.salary.deleteMany({
    where: { employeeId: { in: employeeIds } },
  });
  await prisma.employee.deleteMany({
    where: { id: { in: employeeIds } },
  });
  await prisma.department.deleteMany({ where: { id: departmentId } });
  await prisma.country.deleteMany({ where: { id: countryId } });
  await prisma.user.deleteMany({ where: { id: hrUser.id } });
  await prisma.$disconnect();
});

describe("salaries API — assignment", () => {
  it("assigns an initial salary and creates a null-previous revision", async () => {
    const agent = await loginAgent();
    const csrf = await getCsrf(agent);

    const res = await agent
      .post(`/api/v1/employees/${employeeNoSalaryId}/salary`)
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({
        amount: "72000.50",
        currency: "EUR",
        effectiveDate: "2024-03-01",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.salary).toMatchObject({
      employeeId: employeeNoSalaryId,
      amount: "72000.50",
      currency: "EUR",
      effectiveDate: "2024-03-01",
      version: 1,
    });
    salaryIds.push(res.body.data.salary.id);

    const revisions = await prisma.salaryRevision.findMany({
      where: { salaryId: res.body.data.salary.id },
    });
    expect(revisions).toHaveLength(1);
    expect(revisions[0]!.previousAmount).toBeNull();
    expect(revisions[0]!.previousCurrency).toBeNull();
    expect(revisions[0]!.newAmount.toFixed(2)).toBe("72000.50");
    expect(revisions[0]!.newCurrency).toBe("EUR");
  });

  it("rejects duplicate salary assignment with 409", async () => {
    const agent = await loginAgent();
    const csrf = await getCsrf(agent);

    const res = await agent
      .post(`/api/v1/employees/${employeeWithSalaryId}/salary`)
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({
        amount: "1000.00",
        currency: "USD",
        effectiveDate: "2024-01-01",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SALARY_ALREADY_EXISTS");
  });

  it("returns 404 for missing employee on assign", async () => {
    const agent = await loginAgent();
    const csrf = await getCsrf(agent);

    const res = await agent
      .post("/api/v1/employees/00000000-0000-4000-8000-000000000099/salary")
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({
        amount: "1000.00",
        currency: "USD",
        effectiveDate: "2024-01-01",
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects invalid amount, currency, and date", async () => {
    const agent = await loginAgent();
    const empId = employeeIds[0]!;

    const cases = [
      { amount: "12.345", currency: "USD", effectiveDate: "2024-01-01" },
      { amount: "100.00", currency: "usd", effectiveDate: "2024-01-01" },
      { amount: "100.00", currency: "USD", effectiveDate: "2024-02-30" },
      { amount: "0", currency: "USD", effectiveDate: "2024-01-01" },
      { amount: "-5.00", currency: "USD", effectiveDate: "2024-01-01" },
    ];

    for (const body of cases) {
      const csrf = await getCsrf(agent);
      const res = await agent
        .post(`/api/v1/employees/${empId}/salary`)
        .set("Origin", TRUSTED_ORIGIN)
        .set("X-CSRF-Token", csrf)
        .send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("accepts real ISO 4217 currencies and rejects unknown codes like ZZZ", async () => {
    const agent = await loginAgent();

    for (const currency of ["USD", "EUR", "INR"] as const) {
      const emp = await prisma.employee.create({
        data: {
          employeeNumber: `${PREFIX}-CCY-${currency}`,
          firstName: "Currency",
          lastName: currency,
          jobTitle: "Software Engineer",
          departmentId,
          countryId,
          status: "ACTIVE",
        },
      });
      employeeIds.push(emp.id);

      const csrf = await getCsrf(agent);
      const res = await agent
        .post(`/api/v1/employees/${emp.id}/salary`)
        .set("Origin", TRUSTED_ORIGIN)
        .set("X-CSRF-Token", csrf)
        .send({
          amount: "10000.00",
          currency,
          effectiveDate: "2024-01-15",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.salary.currency).toBe(currency);
      salaryIds.push(res.body.data.salary.id);
    }

    const csrf = await getCsrf(agent);
    const invalid = await agent
      .post(`/api/v1/employees/${employeeIds[0]}/salary`)
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({
        amount: "10000.00",
        currency: "ZZZ",
        effectiveDate: "2024-01-15",
      });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rolls back salary insert when revision creation fails", async () => {
    const emp = await prisma.employee.create({
      data: {
        employeeNumber: `${PREFIX}-ROLL`,
        firstName: "Rollback",
        lastName: "Case",
        jobTitle: "Software Engineer",
        departmentId,
        countryId,
        status: "ACTIVE",
      },
    });
    employeeIds.push(emp.id);

    await expect(
      assignSalary(
        emp.id,
        {
          amount: "50000.00",
          currency: "USD",
          effectiveDate: "2024-06-01",
        },
        "00000000-0000-4000-8000-000000000077",
      ),
    ).rejects.toBeTruthy();

    const salaryCount = await prisma.salary.count({
      where: { employeeId: emp.id },
    });
    const revisionCount = await prisma.salaryRevision.count({
      where: { salary: { employeeId: emp.id } },
    });
    expect(salaryCount).toBe(0);
    expect(revisionCount).toBe(0);
  });
});

describe("salaries API — current salary read", () => {
  it("returns current salary DTO", async () => {
    const agent = await loginAgent();
    const res = await agent.get(
      `/api/v1/employees/${employeeWithSalaryId}/salary`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.salary).toMatchObject({
      employeeId: employeeWithSalaryId,
      amount: "80000.00",
      currency: "USD",
      version: 1,
    });
    expect(res.body.data.salary).toHaveProperty("createdAt");
    expect(res.body.data.salary).toHaveProperty("updatedAt");
  });

  it("returns SALARY_NOT_FOUND when employee has no salary", async () => {
    const emp = await prisma.employee.create({
      data: {
        employeeNumber: `${PREFIX}-EMPTY`,
        firstName: "Empty",
        lastName: "Pay",
        jobTitle: "Software Engineer",
        departmentId,
        countryId,
        status: "ACTIVE",
      },
    });
    employeeIds.push(emp.id);

    const agent = await loginAgent();
    const res = await agent.get(`/api/v1/employees/${emp.id}/salary`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SALARY_NOT_FOUND");
  });
});

describe("salaries API — revision", () => {
  it("revises salary with correct previous/new values and increments version", async () => {
    const agent = await loginAgent();
    const csrf = await getCsrf(agent);

    const res = await agent
      .patch(`/api/v1/employees/${employeeWithSalaryId}/salary`)
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({
        amount: "85000.00",
        currency: "GBP",
        effectiveDate: "2024-07-01",
        expectedVersion: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.salary).toMatchObject({
      amount: "85000.00",
      currency: "GBP",
      effectiveDate: "2024-07-01",
      version: 2,
    });

    const revisions = await prisma.salaryRevision.findMany({
      where: { salary: { employeeId: employeeWithSalaryId } },
      orderBy: { changedAt: "asc" },
    });
    expect(revisions.length).toBeGreaterThanOrEqual(2);
    const latest = revisions[revisions.length - 1]!;
    expect(latest.previousAmount?.toFixed(2)).toBe("80000.00");
    expect(latest.previousCurrency).toBe("USD");
    expect(latest.newAmount.toFixed(2)).toBe("85000.00");
    expect(latest.newCurrency).toBe("GBP");
  });

  it("rejects stale expectedVersion with 409 and creates no revision", async () => {
    const beforeCount = await prisma.salaryRevision.count({
      where: { salary: { employeeId: employeeWithSalaryId } },
    });

    const agent = await loginAgent();
    const csrf = await getCsrf(agent);
    const res = await agent
      .patch(`/api/v1/employees/${employeeWithSalaryId}/salary`)
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({
        amount: "90000.00",
        currency: "USD",
        effectiveDate: "2024-08-01",
        expectedVersion: 1,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SALARY_VERSION_CONFLICT");

    const afterCount = await prisma.salaryRevision.count({
      where: { salary: { employeeId: employeeWithSalaryId } },
    });
    expect(afterCount).toBe(beforeCount);

    const current = await prisma.salary.findUniqueOrThrow({
      where: { employeeId: employeeWithSalaryId },
    });
    expect(current.version).toBe(2);
    expect(current.amount.toFixed(2)).toBe("85000.00");
  });

  it("allows only one of two concurrent revisions with the same expectedVersion", async () => {
    const salary = await prisma.salary.create({
      data: {
        employeeId: employeeConcurrencyId,
        amount: new Prisma.Decimal("60000.00"),
        currency: "USD",
        effectiveDate: new Date("2024-01-01"),
        version: 1,
      },
    });
    salaryIds.push(salary.id);
    await prisma.salaryRevision.create({
      data: {
        salaryId: salary.id,
        previousAmount: null,
        previousCurrency: null,
        newAmount: new Prisma.Decimal("60000.00"),
        newCurrency: "USD",
        effectiveDate: new Date("2024-01-01"),
        changedByUserId: hrUser.id,
      },
    });

    const agent = await loginAgent();
    const csrf = await getCsrf(agent);
    const body = {
      amount: "61000.00",
      currency: "USD",
      effectiveDate: "2024-09-01",
      expectedVersion: 1,
    };

    const [a, b] = await Promise.all([
      agent
        .patch(`/api/v1/employees/${employeeConcurrencyId}/salary`)
        .set("Origin", TRUSTED_ORIGIN)
        .set("X-CSRF-Token", csrf)
        .send(body),
      agent
        .patch(`/api/v1/employees/${employeeConcurrencyId}/salary`)
        .set("Origin", TRUSTED_ORIGIN)
        .set("X-CSRF-Token", csrf)
        .send({ ...body, amount: "62000.00" }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect([a.body.error?.code, b.body.error?.code]).toContain(
      "SALARY_VERSION_CONFLICT",
    );

    const current = await prisma.salary.findUniqueOrThrow({
      where: { employeeId: employeeConcurrencyId },
    });
    expect(current.version).toBe(2);
    expect(["61000.00", "62000.00"]).toContain(current.amount.toFixed(2));

    const revisionCount = await prisma.salaryRevision.count({
      where: { salaryId: salary.id },
    });
    expect(revisionCount).toBe(2);
  });
});

describe("salaries API — history", () => {
  it("returns revisions newest first with safe user attribution", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get(`/api/v1/employees/${employeeWithSalaryId}/salary/revisions`)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    const revisions = res.body.data.revisions as Array<{
      changedAt: string;
      previousAmount: string | null;
      changedBy: { id: string; email: string; displayName: string };
    }>;

    for (let i = 1; i < revisions.length; i += 1) {
      expect(
        new Date(revisions[i - 1]!.changedAt).getTime() >=
          new Date(revisions[i]!.changedAt).getTime(),
      ).toBe(true);
    }

    const initial = revisions.find((r) => r.previousAmount === null);
    expect(initial).toBeTruthy();

    expect(revisions[0]!.changedBy).toMatchObject({
      id: hrUser.id,
      email: hrUser.email,
      displayName: "Salary Test HR",
    });
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain("password");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("$argon2");
  });

  it("paginates revision history", async () => {
    const agent = await loginAgent();
    const page1 = await agent
      .get(`/api/v1/employees/${employeeWithSalaryId}/salary/revisions`)
      .query({ page: 1, limit: 1 });
    expect(page1.status).toBe(200);
    expect(page1.body.data.revisions).toHaveLength(1);
    expect(page1.body.data.page).toBe(1);
    expect(page1.body.data.limit).toBe(1);
    expect(page1.body.data.totalPages).toBeGreaterThanOrEqual(2);
  });
});

describe("salaries API — security", () => {
  it("rejects unauthenticated requests", async () => {
    const app = createApp();
    const res = await request(app).get(
      `/api/v1/employees/${employeeWithSalaryId}/salary`,
    );
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects missing CSRF on POST and PATCH", async () => {
    const agent = await loginAgent();

    const post = await agent
      .post(`/api/v1/employees/${employeeNoSalaryId}/salary`)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        amount: "1000.00",
        currency: "USD",
        effectiveDate: "2024-01-01",
      });
    expect(post.status).toBe(403);

    const patch = await agent
      .patch(`/api/v1/employees/${employeeWithSalaryId}/salary`)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        amount: "1000.00",
        currency: "USD",
        effectiveDate: "2024-01-01",
        expectedVersion: 2,
      });
    expect(patch.status).toBe(403);
  });

  it("does not expose revision mutation endpoints", async () => {
    const agent = await loginAgent();
    const csrf = await getCsrf(agent);

    const del = await agent
      .delete(`/api/v1/employees/${employeeWithSalaryId}/salary/revisions`)
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf);
    expect(del.status).toBe(404);

    const post = await agent
      .post(`/api/v1/employees/${employeeWithSalaryId}/salary/revisions`)
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({});
    expect(post.status).toBe(404);
  });
});
