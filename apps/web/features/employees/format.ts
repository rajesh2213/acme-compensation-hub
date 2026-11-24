import { formatMoneyDisplay } from "@/lib/format-money";
import type { EmployeeDetail, EmploymentStatus, SalaryDto } from "./types";

export function fullName(employee: {
  firstName: string;
  lastName: string;
}): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

export function formatStatus(status: EmploymentStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "TERMINATED":
      return "Terminated";
    default:
      return status;
  }
}

export function formatSalary(salary: SalaryDto | null | undefined): string {
  if (!salary) return "—";
  return formatMoneyDisplay(salary.amount, salary.currency);
}

export function formatHireDate(value: string | null | undefined): string {
  if (!value) return "—";
  return value;
}

export function salarySummary(employee: EmployeeDetail): string {
  if (!employee.salary) return "No salary assigned";
  return `${formatSalary(employee.salary)} · effective ${employee.salary.effectiveDate}`;
}
