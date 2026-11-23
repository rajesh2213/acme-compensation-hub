import "dotenv/config";
import * as argon2 from "argon2";
import { prisma } from "../src/db/prisma.js";
import {
  ANNUAL_SALARY_BANDS,
  COUNTRIES,
  DEPARTMENTS,
  EMPLOYEE_COUNT,
  EXTRA_REVISION_EMPLOYEE_COUNT,
  FIRST_NAMES,
  JOB_TITLES,
  LAST_NAMES,
} from "./seed/data.js";
import { annualAmountCents, centsToDecimal, raiseCents } from "./seed/money.js";
import { resetSeedData } from "./seed/reset.js";

function requireSeedEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in apps/api/.env before running the seed (local demo only).`,
    );
  }
  return value;
}

function employeeNumber(index: number): string {
  return `E${String(index).padStart(6, "0")}`;
}

function statusFor(index: number): "ACTIVE" | "INACTIVE" | "TERMINATED" {
  const bucket = index % 100;
  if (bucket < 92) return "ACTIVE";
  if (bucket < 97) return "INACTIVE";
  return "TERMINATED";
}

function hireDateFor(index: number): Date | null {
  if (index % 7 === 0) return null;
  const year = 2015 + (index % 10);
  const month = (index % 12) + 1;
  const day = (index % 28) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function effectiveDateFor(index: number): Date {
  const year = 2020 + (index % 5);
  const month = (index % 12) + 1;
  const day = (index % 28) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function decimalToCents(value: { toFixed: (digits: number) => string }): number {
  const [whole, frac = "00"] = value.toFixed(2).split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
}

async function seedReferenceData() {
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: country.code },
      create: { code: country.code, name: country.name },
      update: { name: country.name },
    });
  }

  for (const department of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: department.code },
      create: { code: department.code, name: department.name },
      update: { name: department.name },
    });
  }

  const countries = await prisma.country.findMany();
  const departments = await prisma.department.findMany();
  const countryByCode = new Map(countries.map((c) => [c.code.trim(), c]));
  const departmentByCode = new Map(departments.map((d) => [d.code, d]));

  return { countryByCode, departmentByCode };
}

async function seedHrUser() {
  const email = requireSeedEnv("SEED_HR_EMAIL");
  const displayName = process.env.SEED_HR_DISPLAY_NAME?.trim() || "Demo HR Manager";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { email },
      data: {
        displayName,
        isActive: true,
      },
    });
  }

  const password = requireSeedEnv("SEED_HR_PASSWORD");
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      isActive: true,
    },
  });
}

async function seedEmployees(
  countryByCode: Map<string, { id: string; code: string }>,
  departmentByCode: Map<string, { id: string; code: string }>,
) {
  const countries = COUNTRIES.map((c) => {
    const row = countryByCode.get(c.code);
    if (!row) throw new Error(`Missing country ${c.code}`);
    return row;
  });
  const departments = DEPARTMENTS.map((d) => {
    const row = departmentByCode.get(d.code);
    if (!row) throw new Error(`Missing department ${d.code}`);
    return row;
  });

  const existing = await prisma.employee.findMany({
    select: { employeeNumber: true },
  });
  const existingNumbers = new Set(existing.map((e) => e.employeeNumber));

  const batch: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    departmentId: string;
    countryId: string;
    status: string;
    hireDate: Date | null;
  }[] = [];

  for (let i = 1; i <= EMPLOYEE_COUNT; i += 1) {
    const number = employeeNumber(i);
    if (existingNumbers.has(number)) continue;

    batch.push({
      employeeNumber: number,
      firstName: FIRST_NAMES[(i - 1) % FIRST_NAMES.length]!,
      lastName: LAST_NAMES[((i - 1) * 7) % LAST_NAMES.length]!,
      jobTitle: JOB_TITLES[(i - 1) % JOB_TITLES.length]!,
      departmentId: departments[(i - 1) % departments.length]!.id,
      countryId: countries[(i - 1) % countries.length]!.id,
      status: statusFor(i),
      hireDate: hireDateFor(i),
    });

    if (batch.length >= 500) {
      await prisma.employee.createMany({ data: batch });
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await prisma.employee.createMany({ data: batch });
  }
}

async function seedSalariesAndInitialRevisions(hrUserId: string) {
  const activeWithoutSalary = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      salary: null,
      employeeNumber: {
        gte: employeeNumber(1),
        lte: employeeNumber(EMPLOYEE_COUNT),
      },
    },
    select: { id: true, employeeNumber: true },
    orderBy: { employeeNumber: "asc" },
  });

  const chunkSize = 100;
  for (let offset = 0; offset < activeWithoutSalary.length; offset += chunkSize) {
    const chunk = activeWithoutSalary.slice(offset, offset + chunkSize);

    await prisma.$transaction(async (tx) => {
      for (const employee of chunk) {
        const index = Number(employee.employeeNumber.slice(1));
        const band = ANNUAL_SALARY_BANDS[(index - 1) % ANNUAL_SALARY_BANDS.length]!;
        const cents = annualAmountCents(index, band.minCents, band.maxCents);
        const amount = centsToDecimal(cents);
        const effectiveDate = effectiveDateFor(index);

        const salary = await tx.salary.create({
          data: {
            employeeId: employee.id,
            amount,
            currency: band.currency,
            effectiveDate,
            version: 1,
          },
        });

        await tx.salaryRevision.create({
          data: {
            salaryId: salary.id,
            previousAmount: null,
            previousCurrency: null,
            newAmount: amount,
            newCurrency: band.currency,
            effectiveDate,
            changedByUserId: hrUserId,
          },
        });
      }
    });
  }

  return activeWithoutSalary.length;
}

async function seedExtraRevisions(hrUserId: string) {
  const candidates = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
      salary: { isNot: null },
      employeeNumber: {
        gte: employeeNumber(1),
        lte: employeeNumber(EXTRA_REVISION_EMPLOYEE_COUNT),
      },
    },
    include: {
      salary: {
        include: { revisions: true },
      },
    },
    orderBy: { employeeNumber: "asc" },
  });

  let created = 0;

  for (const employee of candidates) {
    const salary = employee.salary;
    if (!salary) continue;
    if (salary.revisions.length !== 1 || salary.version !== 1) continue;

    const index = Number(employee.employeeNumber.slice(1));
    const prevCents = decimalToCents(salary.amount);
    const basisPoints = 300 + (index % 8) * 50;
    const nextAmount = centsToDecimal(raiseCents(prevCents, basisPoints));
    const nextDate = new Date(
      Date.UTC(2025, index % 12, Math.min(28, 1 + (index % 27))),
    );

    const didCreate = await prisma.$transaction(async (tx) => {
      const updated = await tx.salary.updateMany({
        where: { id: salary.id, version: 1 },
        data: {
          amount: nextAmount,
          currency: salary.currency,
          effectiveDate: nextDate,
          version: 2,
        },
      });

      if (updated.count !== 1) {
        return false;
      }

      await tx.salaryRevision.create({
        data: {
          salaryId: salary.id,
          previousAmount: salary.amount,
          previousCurrency: salary.currency,
          newAmount: nextAmount,
          newCurrency: salary.currency,
          effectiveDate: nextDate,
          changedByUserId: hrUserId,
        },
      });

      return true;
    });

    if (didCreate) {
      created += 1;
    }
  }

  return created;
}

async function printSummary() {
  const [
    countries,
    departments,
    employees,
    activeEmployees,
    salaries,
    revisions,
    users,
  ] = await Promise.all([
    prisma.country.count(),
    prisma.department.count(),
    prisma.employee.count(),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.salary.count(),
    prisma.salaryRevision.count(),
    prisma.user.count(),
  ]);

  console.log(
    JSON.stringify(
      {
        countries,
        departments,
        employees,
        activeEmployees,
        salaries,
        revisions,
        users,
        jobTitlePoolSize: JOB_TITLES.length,
      },
      null,
      2,
    ),
  );
}

async function main() {
  if (process.env.SEED_RESET?.trim()) {
    await resetSeedData(prisma);
  }

  console.log("Seeding reference data…");
  const { countryByCode, departmentByCode } = await seedReferenceData();

  console.log("Seeding HR demo user…");
  const hrUser = await seedHrUser();

  console.log("Seeding employees…");
  await seedEmployees(countryByCode, departmentByCode);

  console.log("Seeding salaries + initial revisions…");
  const salariesCreated = await seedSalariesAndInitialRevisions(hrUser.id);

  console.log("Seeding extra revision history…");
  const extraRevisions = await seedExtraRevisions(hrUser.id);

  console.log(
    `Done. salariesCreated=${salariesCreated} extraRevisions=${extraRevisions}`,
  );
  await printSummary();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
