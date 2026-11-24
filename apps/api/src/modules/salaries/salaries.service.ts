import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../lib/errors.js";
import type {
  AssignSalaryBody,
  ListRevisionsQuery,
  ReviseSalaryBody,
} from "./salaries.schemas.js";
import type {
  CurrentSalaryDto,
  SafeChangedByUser,
  SalaryRevisionDto,
  SalaryRevisionListResult,
} from "./salaries.types.js";

const salarySelect = {
  id: true,
  employeeId: true,
  amount: true,
  currency: true,
  effectiveDate: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} as const;

const changedBySelect = {
  id: true,
  email: true,
  displayName: true,
  isActive: true,
} as const;

type SalaryRow = {
  id: string;
  employeeId: string;
  amount: Prisma.Decimal;
  currency: string;
  effectiveDate: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatMoney(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toCurrentSalaryDto(row: SalaryRow): CurrentSalaryDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    amount: formatMoney(row.amount),
    currency: row.currency,
    effectiveDate: formatDateOnly(row.effectiveDate),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toChangedBy(user: SafeChangedByUser): SafeChangedByUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isActive: user.isActive,
  };
}

function toRevisionDto(row: {
  id: string;
  previousAmount: Prisma.Decimal | null;
  previousCurrency: string | null;
  newAmount: Prisma.Decimal;
  newCurrency: string;
  effectiveDate: Date;
  changedAt: Date;
  changedBy: SafeChangedByUser;
}): SalaryRevisionDto {
  return {
    id: row.id,
    previousAmount: row.previousAmount ? formatMoney(row.previousAmount) : null,
    previousCurrency: row.previousCurrency,
    newAmount: formatMoney(row.newAmount),
    newCurrency: row.newCurrency,
    effectiveDate: formatDateOnly(row.effectiveDate),
    changedAt: row.changedAt.toISOString(),
    changedBy: toChangedBy(row.changedBy),
  };
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.map(String) : [String(target ?? "")];
      if (fields.some((f) => f.includes("employee"))) {
        throw new AppError(
          409,
          "SALARY_ALREADY_EXISTS",
          "A salary already exists for this employee",
        );
      }
    }
  }
  throw error;
}

async function assertEmployeeExists(employeeId: string): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!employee) {
    throw new AppError(404, "NOT_FOUND", "Employee not found");
  }
}

export async function getCurrentSalary(employeeId: string): Promise<CurrentSalaryDto> {
  await assertEmployeeExists(employeeId);

  const salary = await prisma.salary.findUnique({
    where: { employeeId },
    select: salarySelect,
  });
  if (!salary) {
    throw new AppError(404, "SALARY_NOT_FOUND", "Salary not found for this employee");
  }

  return toCurrentSalaryDto(salary as SalaryRow);
}

export async function assignSalary(
  employeeId: string,
  body: AssignSalaryBody,
  changedByUserId: string,
): Promise<CurrentSalaryDto> {
  await assertEmployeeExists(employeeId);

  const existing = await prisma.salary.findUnique({
    where: { employeeId },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(
      409,
      "SALARY_ALREADY_EXISTS",
      "A salary already exists for this employee",
    );
  }

  const amount = new Prisma.Decimal(body.amount);
  const effectiveDate = toDate(body.effectiveDate);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const salary = await tx.salary.create({
        data: {
          employeeId,
          amount,
          currency: body.currency,
          effectiveDate,
          version: 1,
        },
        select: salarySelect,
      });

      await tx.salaryRevision.create({
        data: {
          salaryId: salary.id,
          previousAmount: null,
          previousCurrency: null,
          newAmount: amount,
          newCurrency: body.currency,
          effectiveDate,
          changedByUserId,
        },
        select: { id: true },
      });

      return salary;
    });

    return toCurrentSalaryDto(created as SalaryRow);
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function reviseSalary(
  employeeId: string,
  body: ReviseSalaryBody,
  changedByUserId: string,
): Promise<CurrentSalaryDto> {
  await assertEmployeeExists(employeeId);

  const current = await prisma.salary.findUnique({
    where: { employeeId },
    select: salarySelect,
  });
  if (!current) {
    throw new AppError(404, "SALARY_NOT_FOUND", "Salary not found for this employee");
  }

  if (current.version !== body.expectedVersion) {
    throw new AppError(
      409,
      "SALARY_VERSION_CONFLICT",
      "Salary was modified by another request; reload and retry",
    );
  }

  const newAmount = new Prisma.Decimal(body.amount);
  const effectiveDate = toDate(body.effectiveDate);
  const previousAmount = current.amount;
  const previousCurrency = current.currency;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.salary.updateMany({
        where: {
          id: current.id,
          version: body.expectedVersion,
        },
        data: {
          amount: newAmount,
          currency: body.currency,
          effectiveDate,
          version: { increment: 1 },
        },
      });

      if (result.count !== 1) {
        throw new AppError(
          409,
          "SALARY_VERSION_CONFLICT",
          "Salary was modified by another request; reload and retry",
        );
      }

      await tx.salaryRevision.create({
        data: {
          salaryId: current.id,
          previousAmount,
          previousCurrency,
          newAmount,
          newCurrency: body.currency,
          effectiveDate,
          changedByUserId,
        },
        select: { id: true },
      });

      const salary = await tx.salary.findUniqueOrThrow({
        where: { id: current.id },
        select: salarySelect,
      });
      return salary;
    });

    return toCurrentSalaryDto(updated as SalaryRow);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    mapPrismaError(error);
  }
}

export async function listSalaryRevisions(
  employeeId: string,
  query: ListRevisionsQuery,
): Promise<SalaryRevisionListResult> {
  await assertEmployeeExists(employeeId);

  const salary = await prisma.salary.findUnique({
    where: { employeeId },
    select: { id: true },
  });
  if (!salary) {
    throw new AppError(404, "SALARY_NOT_FOUND", "Salary not found for this employee");
  }

  const where = { salaryId: salary.id };
  const skip = (query.page - 1) * query.limit;

  const [total, rows] = await Promise.all([
    prisma.salaryRevision.count({ where }),
    prisma.salaryRevision.findMany({
      where,
      select: {
        id: true,
        previousAmount: true,
        previousCurrency: true,
        newAmount: true,
        newCurrency: true,
        effectiveDate: true,
        changedAt: true,
        changedBy: { select: changedBySelect },
      },
      orderBy: [{ changedAt: "desc" }, { id: "asc" }],
      skip,
      take: query.limit,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    revisions: rows.map(toRevisionDto),
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
}
