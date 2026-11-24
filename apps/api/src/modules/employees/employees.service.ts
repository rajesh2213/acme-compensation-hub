import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../lib/errors.js";
import type {
  CreateEmployeeBody,
  ListEmployeesQuery,
  UpdateEmployeeBody,
} from "./employees.schemas.js";
import type {
  EmployeeDetailDto,
  EmployeeListItemDto,
  EmployeeListResult,
  EmploymentStatus,
  RefDto,
  SalaryDto,
} from "./employees.types.js";

const employeeCoreSelect = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  jobTitle: true,
  departmentId: true,
  countryId: true,
  status: true,
  hireDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

const refSelect = {
  id: true,
  code: true,
  name: true,
} as const;

const listSelect = {
  ...employeeCoreSelect,
  department: { select: refSelect },
  country: { select: refSelect },
} as const;

const detailSelect = {
  ...listSelect,
  salary: {
    select: {
      id: true,
      amount: true,
      currency: true,
      effectiveDate: true,
      version: true,
    },
  },
} as const;

type ListRow = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  departmentId: string;
  countryId: string;
  status: string;
  hireDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  department: RefDto;
  country: RefDto;
};

type DetailRow = ListRow & {
  salary: {
    id: string;
    amount: Prisma.Decimal;
    currency: string;
    effectiveDate: Date;
    version: number;
  } | null;
};

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toRef(ref: RefDto): RefDto {
  return { id: ref.id, code: ref.code, name: ref.name };
}

function toSalaryDto(salary: NonNullable<DetailRow["salary"]>): SalaryDto {
  return {
    id: salary.id,
    amount: salary.amount.toFixed(2),
    currency: salary.currency,
    effectiveDate: formatDateOnly(salary.effectiveDate),
    version: salary.version,
  };
}

function toListItem(row: ListRow): EmployeeListItemDto {
  return {
    id: row.id,
    employeeNumber: row.employeeNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    jobTitle: row.jobTitle,
    departmentId: row.departmentId,
    countryId: row.countryId,
    status: row.status as EmploymentStatus,
    hireDate: row.hireDate ? formatDateOnly(row.hireDate) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    department: toRef(row.department),
    country: toRef(row.country),
  };
}

function toDetail(row: DetailRow): EmployeeDetailDto {
  return {
    ...toListItem(row),
    salary: row.salary ? toSalaryDto(row.salary) : null,
  };
}

function buildListWhere(query: ListEmployeesQuery): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};

  if (query.countryId) where.countryId = query.countryId;
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.status) where.status = query.status;
  if (query.jobTitle) {
    where.jobTitle = { equals: query.jobTitle, mode: "insensitive" };
  }
  if (query.search) {
    where.OR = [
      { employeeNumber: { contains: query.search, mode: "insensitive" } },
      { firstName: { contains: query.search, mode: "insensitive" } },
      { lastName: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(
  sortBy: ListEmployeesQuery["sortBy"],
  sortOrder: ListEmployeesQuery["sortOrder"],
): Prisma.EmployeeOrderByWithRelationInput[] {
  // Secondary unique key keeps pagination stable when primary values tie.
  return [{ [sortBy]: sortOrder }, { id: "asc" }];
}

function toHireDateInput(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new AppError(
        409,
        "EMPLOYEE_NUMBER_CONFLICT",
        "An employee with this employee number already exists",
      );
    }
    if (error.code === "P2003") {
      throw new AppError(400, "VALIDATION_ERROR", "Referenced record does not exist");
    }
  }
  throw error;
}

async function assertDepartmentExists(departmentId: string): Promise<void> {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true },
  });
  if (!department) {
    throw new AppError(400, "DEPARTMENT_NOT_FOUND", "Department not found");
  }
}

async function assertCountryExists(countryId: string): Promise<void> {
  const country = await prisma.country.findUnique({
    where: { id: countryId },
    select: { id: true },
  });
  if (!country) {
    throw new AppError(400, "COUNTRY_NOT_FOUND", "Country not found");
  }
}

async function getEmployeeDetailOrThrow(id: string): Promise<EmployeeDetailDto> {
  const row = await prisma.employee.findUnique({
    where: { id },
    select: detailSelect,
  });
  if (!row) {
    throw new AppError(404, "NOT_FOUND", "Employee not found");
  }
  return toDetail(row as DetailRow);
}

export async function listEmployees(
  query: ListEmployeesQuery,
): Promise<EmployeeListResult> {
  const where = buildListWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [total, rows] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      select: listSelect,
      orderBy: buildOrderBy(query.sortBy, query.sortOrder),
      skip,
      take: query.limit,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

  return {
    employees: (rows as ListRow[]).map(toListItem),
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
}

export async function getEmployeeById(id: string): Promise<EmployeeDetailDto> {
  return getEmployeeDetailOrThrow(id);
}

export async function createEmployee(
  body: CreateEmployeeBody,
): Promise<EmployeeDetailDto> {
  await assertDepartmentExists(body.departmentId);
  await assertCountryExists(body.countryId);

  let createdId: string;
  try {
    const created = await prisma.employee.create({
      data: {
        employeeNumber: body.employeeNumber,
        firstName: body.firstName,
        lastName: body.lastName,
        jobTitle: body.jobTitle,
        departmentId: body.departmentId,
        countryId: body.countryId,
        status: body.status,
        hireDate: toHireDateInput(body.hireDate ?? null) as Date | null,
      },
      select: { id: true },
    });
    createdId = created.id;
  } catch (error) {
    mapPrismaError(error);
  }

  return getEmployeeDetailOrThrow(createdId);
}

export async function updateEmployee(
  id: string,
  body: UpdateEmployeeBody,
): Promise<EmployeeDetailDto> {
  const existing = await prisma.employee.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Employee not found");
  }

  if (body.departmentId) {
    await assertDepartmentExists(body.departmentId);
  }
  if (body.countryId) {
    await assertCountryExists(body.countryId);
  }

  const data: Prisma.EmployeeUpdateInput = {};
  if (body.employeeNumber !== undefined) data.employeeNumber = body.employeeNumber;
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.jobTitle !== undefined) data.jobTitle = body.jobTitle;
  if (body.status !== undefined) data.status = body.status;
  if (body.hireDate !== undefined) data.hireDate = toHireDateInput(body.hireDate) as Date | null;
  if (body.departmentId !== undefined) {
    data.department = { connect: { id: body.departmentId } };
  }
  if (body.countryId !== undefined) {
    data.country = { connect: { id: body.countryId } };
  }

  try {
    await prisma.employee.update({
      where: { id },
      data,
      select: { id: true },
    });
  } catch (error) {
    mapPrismaError(error);
  }

  return getEmployeeDetailOrThrow(id);
}
