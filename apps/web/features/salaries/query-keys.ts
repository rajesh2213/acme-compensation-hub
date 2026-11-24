import type { SalaryRevisionsParams } from "./types";

export const salariesKeys = {
  all: ["salaries"] as const,
  currents: () => [...salariesKeys.all, "current"] as const,
  current: (employeeId: string) =>
    [...salariesKeys.currents(), employeeId] as const,
  revisionLists: () => [...salariesKeys.all, "revisions"] as const,
  revisionsForEmployee: (employeeId: string) =>
    [...salariesKeys.revisionLists(), employeeId] as const,
  revisions: (employeeId: string, params: SalaryRevisionsParams) =>
    [...salariesKeys.revisionsForEmployee(employeeId), params] as const,
};
