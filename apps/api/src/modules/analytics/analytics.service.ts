import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/prisma.js";
import type { AnalyticsFiltersQuery } from "./analytics.schemas.js";
import type {
  CompensationAnalyticsDto,
  CompensationByCountryDto,
  CompensationByDepartmentDto,
  CompensationStatsDto,
  DistributionBucket,
  OverviewAnalyticsDto,
} from "./analytics.types.js";

type EmployeeWhere = Prisma.EmployeeWhereInput;

function buildEmployeeWhere(filters: AnalyticsFiltersQuery): EmployeeWhere {
  const where: EmployeeWhere = {};
  if (filters.countryId) where.countryId = filters.countryId;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.status) where.status = filters.status;
  return where;
}

function buildEmployeeSqlFilters(filters: AnalyticsFiltersQuery): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (filters.countryId) {
    parts.push(Prisma.sql`e.country_id = ${filters.countryId}::uuid`);
  }
  if (filters.departmentId) {
    parts.push(Prisma.sql`e.department_id = ${filters.departmentId}::uuid`);
  }
  if (filters.status) {
    parts.push(Prisma.sql`e.status = ${filters.status}`);
  }
  return Prisma.join(parts, " AND ");
}

function formatMoney(value: Prisma.Decimal | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "0.00";
  }
  return new Prisma.Decimal(value).toFixed(2);
}

function toCount(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

type CurrencyAggRow = {
  currency: string;
  employee_count: bigint;
  total: Prisma.Decimal;
  average: Prisma.Decimal;
  minimum: Prisma.Decimal;
  maximum: Prisma.Decimal;
};

type CountryCurrencyAggRow = CurrencyAggRow & {
  country_id: string;
  country_name: string;
};

type DepartmentCurrencyAggRow = CurrencyAggRow & {
  department_id: string;
  department_name: string;
};

function toCompensationStats(row: CurrencyAggRow): CompensationStatsDto {
  return {
    currency: row.currency,
    employeeCount: toCount(row.employee_count),
    totalAnnualPayroll: formatMoney(row.total),
    averageAnnualSalary: formatMoney(row.average),
    minimumAnnualSalary: formatMoney(row.minimum),
    maximumAnnualSalary: formatMoney(row.maximum),
  };
}

export async function getOverviewAnalytics(
  filters: AnalyticsFiltersQuery,
): Promise<OverviewAnalyticsDto> {
  const where = buildEmployeeWhere(filters);

  const [totalEmployees, byStatus, byCountryId, byDepartmentId] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.employee.groupBy({
      by: ["countryId"],
      where,
      _count: { _all: true },
      orderBy: { countryId: "asc" },
    }),
    prisma.employee.groupBy({
      by: ["departmentId"],
      where,
      _count: { _all: true },
      orderBy: { departmentId: "asc" },
    }),
  ]);

  const statusCounts = {
    ACTIVE: 0,
    INACTIVE: 0,
    TERMINATED: 0,
  };
  for (const row of byStatus) {
    if (row.status in statusCounts) {
      statusCounts[row.status as keyof typeof statusCounts] = row._count._all;
    }
  }

  const countryIds = byCountryId.map((row) => row.countryId);
  const departmentIds = byDepartmentId.map((row) => row.departmentId);

  const [countries, departments] = await Promise.all([
    countryIds.length === 0
      ? Promise.resolve([])
      : prisma.country.findMany({
          where: { id: { in: countryIds } },
          select: { id: true, name: true },
        }),
    departmentIds.length === 0
      ? Promise.resolve([])
      : prisma.department.findMany({
          where: { id: { in: departmentIds } },
          select: { id: true, name: true },
        }),
  ]);

  const countryNameById = new Map(countries.map((c) => [c.id, c.name]));
  const departmentNameById = new Map(departments.map((d) => [d.id, d.name]));

  const byCountry: DistributionBucket[] = byCountryId.map((row) => ({
    id: row.countryId,
    name: countryNameById.get(row.countryId) ?? row.countryId,
    employeeCount: row._count._all,
  }));

  const byDepartment: DistributionBucket[] = byDepartmentId.map((row) => ({
    id: row.departmentId,
    name: departmentNameById.get(row.departmentId) ?? row.departmentId,
    employeeCount: row._count._all,
  }));

  return {
    totalEmployees,
    activeEmployees: statusCounts.ACTIVE,
    inactiveEmployees: statusCounts.INACTIVE,
    terminatedEmployees: statusCounts.TERMINATED,
    byCountry,
    byDepartment,
  };
}

export async function getCompensationAnalytics(
  filters: AnalyticsFiltersQuery,
): Promise<CompensationAnalyticsDto> {
  const employeeFilter = buildEmployeeSqlFilters(filters);

  const [byCurrencyRows, byCountryRows, byDepartmentRows] = await Promise.all([
    prisma.$queryRaw<CurrencyAggRow[]>`
      SELECT
        s.currency,
        COUNT(*)::bigint AS employee_count,
        SUM(s.amount) AS total,
        AVG(s.amount) AS average,
        MIN(s.amount) AS minimum,
        MAX(s.amount) AS maximum
      FROM salaries s
      INNER JOIN employees e ON e.id = s.employee_id
      WHERE ${employeeFilter}
      GROUP BY s.currency
      ORDER BY s.currency ASC
    `,
    prisma.$queryRaw<CountryCurrencyAggRow[]>`
      SELECT
        e.country_id,
        c.name AS country_name,
        s.currency,
        COUNT(*)::bigint AS employee_count,
        SUM(s.amount) AS total,
        AVG(s.amount) AS average,
        MIN(s.amount) AS minimum,
        MAX(s.amount) AS maximum
      FROM salaries s
      INNER JOIN employees e ON e.id = s.employee_id
      INNER JOIN countries c ON c.id = e.country_id
      WHERE ${employeeFilter}
      GROUP BY e.country_id, c.name, s.currency
      ORDER BY c.name ASC, s.currency ASC
    `,
    prisma.$queryRaw<DepartmentCurrencyAggRow[]>`
      SELECT
        e.department_id,
        d.name AS department_name,
        s.currency,
        COUNT(*)::bigint AS employee_count,
        SUM(s.amount) AS total,
        AVG(s.amount) AS average,
        MIN(s.amount) AS minimum,
        MAX(s.amount) AS maximum
      FROM salaries s
      INNER JOIN employees e ON e.id = s.employee_id
      INNER JOIN departments d ON d.id = e.department_id
      WHERE ${employeeFilter}
      GROUP BY e.department_id, d.name, s.currency
      ORDER BY d.name ASC, s.currency ASC
    `,
  ]);

  const byCurrency = byCurrencyRows.map(toCompensationStats);

  const byCountryAndCurrency: CompensationByCountryDto[] = byCountryRows.map((row) => ({
    countryId: row.country_id,
    countryName: row.country_name,
    ...toCompensationStats(row),
  }));

  const byDepartmentAndCurrency: CompensationByDepartmentDto[] = byDepartmentRows.map(
    (row) => ({
      departmentId: row.department_id,
      departmentName: row.department_name,
      ...toCompensationStats(row),
    }),
  );

  return {
    byCurrency,
    byCountryAndCurrency,
    byDepartmentAndCurrency,
  };
}
