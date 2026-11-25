import * as argon2 from "argon2";
import { Prisma } from "../generated/prisma/client.js";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { resetLoginRateLimitStore } from "../middleware/login-rate-limit.js";

const TRUSTED_ORIGIN = "http://localhost:3000";
const PREFIX = `E48-${Date.now().toString(36)}`;

type AuthUser = { id: string; email: string; password: string };

let hrUser: AuthUser;
let departmentAId: string;
let departmentBId: string;
let countryAId: string;
let countryBId: string;
let employeeIds: string[] = [];
let salaryEmployeeId: string;
let salaryId: string;

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
  const password = "EmployeeTestPass1!";
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email: `hr.${PREFIX.toLowerCase()}@example.test`,
      passwordHash,
      displayName: "Employee Test HR",
      isActive: true,
    },
  });
  hrUser = { id: user.id, email: user.email, password };

  const [deptA, deptB, countryA, countryB] = await Promise.all([
    prisma.department.create({
      data: { code: `${PREFIX}-DA`, name: `${PREFIX} Dept A` },
    }),
    prisma.department.create({
      data: { code: `${PREFIX}-DB`, name: `${PREFIX} Dept B` },
    }),
    prisma.country.create({
      data: { code: "XA", name: `${PREFIX} Country A` },
    }),
    prisma.country.create({
      data: { code: "XB", name: `${PREFIX} Country B` },
    }),
  ]);

  departmentAId = deptA.id;
  departmentBId = deptB.id;
  countryAId = countryA.id;
  countryBId = countryB.id;

  const fixtures = [
    {
      employeeNumber: `${PREFIX}-001`,
      firstName: "Alpha",
      lastName: "Zephyr",
      jobTitle: "Software Engineer",
      departmentId: departmentAId,
      countryId: countryAId,
      status: "ACTIVE",
      hireDate: new Date("2020-01-15"),
    },
    {
      employeeNumber: `${PREFIX}-002`,
      firstName: "Bravo",
      lastName: "Yarrow",
      jobTitle: "Product Manager",
      departmentId: departmentAId,
      countryId: countryBId,
      status: "ACTIVE",
      hireDate: new Date("2021-06-01"),
    },
    {
      employeeNumber: `${PREFIX}-003`,
      firstName: "Charlie",
      lastName: "Xavier",
      jobTitle: "Software Engineer",
      departmentId: departmentBId,
      countryId: countryAId,
      status: "INACTIVE",
      hireDate: new Date("2019-03-20"),
    },
    {
      employeeNumber: `${PREFIX}-004`,
      firstName: "Delta",
      lastName: "Willow",
      jobTitle: "HR Specialist",
      departmentId: departmentBId,
      countryId: countryBId,
      status: "TERMINATED",
      hireDate: null,
    },
    {
      employeeNumber: `${PREFIX}-005`,
      firstName: "Echo",
      lastName: "Vesper",
      jobTitle: "Software Engineer",
      departmentId: departmentAId,
      countryId: countryAId,
      status: "ACTIVE",
      hireDate: new Date("2022-11-11"),
    },
    {
      employeeNumber: `${PREFIX}-006`,
      firstName: "Foxtrot",
      lastName: "Umber",
      jobTitle: "Product Manager",
      departmentId: departmentBId,
      countryId: countryAId,
      status: "ACTIVE",
      hireDate: new Date("2018-08-08"),
    },
  ];

  for (const fixture of fixtures) {
    const row = await prisma.employee.create({ data: fixture });
    employeeIds.push(row.id);
  }

  salaryEmployeeId = employeeIds[0]!;
  const salary = await prisma.salary.create({
    data: {
      employeeId: salaryEmployeeId,
      amount: new Prisma.Decimal("95000.00"),
      currency: "USD",
      effectiveDate: new Date("2024-01-01"),
      version: 1,
    },
  });
  salaryId = salary.id;
});

afterEach(() => {
  resetLoginRateLimitStore();
});

afterAll(async () => {
  await prisma.salaryRevision.deleteMany({
    where: { salaryId },
  });
  await prisma.salary.deleteMany({
    where: { id: salaryId },
  });
  await prisma.employee.deleteMany({
    where: { id: { in: employeeIds } },
  });
  await prisma.department.deleteMany({
    where: { id: { in: [departmentAId, departmentBId] } },
  });
  await prisma.country.deleteMany({
    where: { id: { in: [countryAId, countryBId] } },
  });
  await prisma.user.deleteMany({
    where: { id: hrUser.id },
  });
  await prisma.$disconnect();
});

describe("employees API", () => {
  it("rejects unauthenticated requests", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/employees");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("lists employees with pagination", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/v1/employees")
      .query({ search: PREFIX, page: 1, limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.employees).toHaveLength(2);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(2);
    expect(res.body.data.total).toBe(6);
    expect(res.body.data.totalPages).toBe(3);
    expect(res.body.data.employees[0]).toHaveProperty("salary");
  });

  it("embeds current salary on list items", async () => {
    const agent = await loginAgent();
    const withSalary = await agent
      .get("/api/v1/employees")
      .query({ search: `${PREFIX}-001` });
    expect(withSalary.status).toBe(200);
    expect(withSalary.body.data.employees).toHaveLength(1);
    expect(withSalary.body.data.employees[0].salary).toMatchObject({
      id: salaryId,
      amount: "95000.00",
      currency: "USD",
      effectiveDate: "2024-01-01",
      version: 1,
    });

    const withoutSalary = await agent
      .get("/api/v1/employees")
      .query({ search: `${PREFIX}-002` });
    expect(withoutSalary.status).toBe(200);
    expect(withoutSalary.body.data.employees).toHaveLength(1);
    expect(withoutSalary.body.data.employees[0].salary).toBeNull();
  });

  it("searches by employee number and name", async () => {
    const agent = await loginAgent();

    const byNumber = await agent
      .get("/api/v1/employees")
      .query({ search: `${PREFIX}-003` });
    expect(byNumber.status).toBe(200);
    expect(byNumber.body.data.total).toBe(1);
    expect(byNumber.body.data.employees[0].employeeNumber).toBe(`${PREFIX}-003`);

    const byName = await agent
      .get("/api/v1/employees")
      .query({ search: "zephyr" });
    expect(byName.status).toBe(200);
    expect(
      byName.body.data.employees.some(
        (e: { employeeNumber: string }) => e.employeeNumber === `${PREFIX}-001`,
      ),
    ).toBe(true);
  });

  it("filters by country, department, job title and status", async () => {
    const agent = await loginAgent();

    const byCountry = await agent
      .get("/api/v1/employees")
      .query({ search: PREFIX, countryId: countryAId });
    expect(byCountry.status).toBe(200);
    expect(byCountry.body.data.total).toBe(4);
    expect(
      byCountry.body.data.employees.every(
        (e: { countryId: string }) => e.countryId === countryAId,
      ),
    ).toBe(true);

    const byDept = await agent
      .get("/api/v1/employees")
      .query({ search: PREFIX, departmentId: departmentBId });
    expect(byDept.body.data.total).toBe(3);

    const byTitle = await agent
      .get("/api/v1/employees")
      .query({ search: PREFIX, jobTitle: "software engineer" });
    expect(byTitle.body.data.total).toBe(3);

    const byStatus = await agent
      .get("/api/v1/employees")
      .query({ search: PREFIX, status: "TERMINATED" });
    expect(byStatus.body.data.total).toBe(1);
    expect(byStatus.body.data.employees[0].status).toBe("TERMINATED");
  });

  it("sorts by allowlisted fields and rejects oversized page limits", async () => {
    const agent = await loginAgent();

    const sorted = await agent.get("/api/v1/employees").query({
      search: PREFIX,
      sortBy: "lastName",
      sortOrder: "asc",
      limit: 10,
    });
    expect(sorted.status).toBe(200);
    const rows = sorted.body.data.employees as Array<{
      id: string;
      lastName: string;
    }>;
    const names = rows.map((e) => e.lastName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    // Stable secondary order by id when primary sort values are equal.
    for (let i = 1; i < rows.length; i += 1) {
      if (rows[i]!.lastName === rows[i - 1]!.lastName) {
        expect(rows[i]!.id > rows[i - 1]!.id).toBe(true);
      }
    }

    const tooLarge = await agent
      .get("/api/v1/employees")
      .query({ search: PREFIX, limit: 101 });
    expect(tooLarge.status).toBe(400);
    expect(tooLarge.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns empty result sets cleanly", async () => {
    const agent = await loginAgent();
    const res = await agent
      .get("/api/v1/employees")
      .query({ search: `${PREFIX}-NOMATCH` });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      employees: [],
      total: 0,
      totalPages: 0,
      page: 1,
    });
  });

  it("returns employee detail with relations and current salary", async () => {
    const agent = await loginAgent();
    const res = await agent.get(`/api/v1/employees/${salaryEmployeeId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.employee.id).toBe(salaryEmployeeId);
    expect(res.body.data.employee.department.id).toBe(departmentAId);
    expect(res.body.data.employee.country.id).toBe(countryAId);
    expect(res.body.data.employee.salary).toMatchObject({
      id: salaryId,
      amount: "95000.00",
      currency: "USD",
      version: 1,
    });
    expect(res.body.data.employee.salary).not.toHaveProperty("revisions");
    expect(JSON.stringify(res.body)).not.toContain("previousAmount");
  });

  it("returns 404 for nonexistent employees", async () => {
    const agent = await loginAgent();
    const res = await agent.get(
      "/api/v1/employees/00000000-0000-4000-8000-000000000099",
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("creates an employee without creating a salary", async () => {
    const agent = await loginAgent();
    const csrf = await getCsrf(agent);
    const number = `${PREFIX}-NEW`;

    const res = await agent
      .post("/api/v1/employees")
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({
        employeeNumber: number,
        firstName: "Golf",
        lastName: "Tango",
        jobTitle: "Data Analyst",
        departmentId: departmentAId,
        countryId: countryAId,
        status: "ACTIVE",
        hireDate: "2023-05-05",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.employee.employeeNumber).toBe(number);
    expect(res.body.data.employee.salary).toBeNull();
    expect(res.body.data.employee.department.id).toBe(departmentAId);
    employeeIds.push(res.body.data.employee.id);

    const salaryCount = await prisma.salary.count({
      where: { employeeId: res.body.data.employee.id },
    });
    expect(salaryCount).toBe(0);
  });

  it("rejects duplicate employee numbers with 409", async () => {
    const agent = await loginAgent();
    const csrf = await getCsrf(agent);

    const res = await agent
      .post("/api/v1/employees")
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({
        employeeNumber: `${PREFIX}-001`,
        firstName: "Dup",
        lastName: "User",
        jobTitle: "Software Engineer",
        departmentId: departmentAId,
        countryId: countryAId,
        status: "ACTIVE",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMPLOYEE_NUMBER_CONFLICT");
  });

  it("rejects invalid department and country references", async () => {
    const agent = await loginAgent();
    const csrf = await getCsrf(agent);
    const missingId = "00000000-0000-4000-8000-000000000088";

    const badDept = await agent
      .post("/api/v1/employees")
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({
        employeeNumber: `${PREFIX}-BAD-D`,
        firstName: "Bad",
        lastName: "Dept",
        jobTitle: "Software Engineer",
        departmentId: missingId,
        countryId: countryAId,
        status: "ACTIVE",
      });
    expect(badDept.status).toBe(400);
    expect(badDept.body.error.code).toBe("DEPARTMENT_NOT_FOUND");

    const csrf2 = await getCsrf(agent);
    const badCountry = await agent
      .post("/api/v1/employees")
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf2)
      .send({
        employeeNumber: `${PREFIX}-BAD-C`,
        firstName: "Bad",
        lastName: "Country",
        jobTitle: "Software Engineer",
        departmentId: departmentAId,
        countryId: missingId,
        status: "ACTIVE",
      });
    expect(badCountry.status).toBe(400);
    expect(badCountry.body.error.code).toBe("COUNTRY_NOT_FOUND");
  });

  it("updates employees with partial validation and rejects empty updates", async () => {
    const agent = await loginAgent();
    const targetId = employeeIds[1]!;

    const emptyCsrf = await getCsrf(agent);
    const empty = await agent
      .patch(`/api/v1/employees/${targetId}`)
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", emptyCsrf)
      .send({});
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe("VALIDATION_ERROR");

    const csrf = await getCsrf(agent);
    const res = await agent
      .patch(`/api/v1/employees/${targetId}`)
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({ firstName: "BravoUpdated", status: "INACTIVE" });

    expect(res.status).toBe(200);
    expect(res.body.data.employee.firstName).toBe("BravoUpdated");
    expect(res.body.data.employee.status).toBe("INACTIVE");
    expect(res.body.data.employee.salary).toBeNull();
    expect(res.body.data.employee.department).toBeTruthy();
  });

  it("never creates or modifies salaries via employee operations", async () => {
    const before = await prisma.salary.findUnique({ where: { id: salaryId } });
    expect(before).toBeTruthy();

    const agent = await loginAgent();
    const csrf = await getCsrf(agent);
    await agent
      .patch(`/api/v1/employees/${salaryEmployeeId}`)
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({ jobTitle: "Senior Software Engineer" })
      .expect(200);

    const after = await prisma.salary.findUnique({ where: { id: salaryId } });
    expect(after?.amount.toFixed(2)).toBe(before!.amount.toFixed(2));
    expect(after?.version).toBe(before!.version);
    expect(after?.currency).toBe(before!.currency);
    expect(after?.updatedAt.toISOString()).toBe(before!.updatedAt.toISOString());

    const revisionCount = await prisma.salaryRevision.count({
      where: { salaryId },
    });
    expect(revisionCount).toBe(0);
  });

  it("enforces CSRF on create and update", async () => {
    const agent = await loginAgent();

    const createMissing = await agent.post("/api/v1/employees").set("Origin", TRUSTED_ORIGIN).send({
      employeeNumber: `${PREFIX}-CSRF`,
      firstName: "Csrf",
      lastName: "Fail",
      jobTitle: "Software Engineer",
      departmentId: departmentAId,
      countryId: countryAId,
      status: "ACTIVE",
    });
    expect(createMissing.status).toBe(403);
    expect(createMissing.body.error.code).toBe("CSRF_TOKEN_INVALID");

    const updateMissing = await agent
      .patch(`/api/v1/employees/${employeeIds[0]}`)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ firstName: "Nope" });
    expect(updateMissing.status).toBe(403);
    expect(updateMissing.body.error.code).toBe("CSRF_TOKEN_INVALID");
  });

  it("rejects invalid hireDate values", async () => {
    const agent = await loginAgent();
    const csrf = await getCsrf(agent);

    const res = await agent
      .post("/api/v1/employees")
      .set("Origin", TRUSTED_ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({
        employeeNumber: `${PREFIX}-BAD-DATE`,
        firstName: "Bad",
        lastName: "Date",
        jobTitle: "Software Engineer",
        departmentId: departmentAId,
        countryId: countryAId,
        status: "ACTIVE",
        hireDate: "2024-02-30",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
