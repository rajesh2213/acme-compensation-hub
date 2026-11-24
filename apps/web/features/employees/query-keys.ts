import type { EmployeeListParams } from "./types";

export const employeesKeys = {
  all: ["employees"] as const,
  lists: () => [...employeesKeys.all, "list"] as const,
  list: (params: EmployeeListParams) =>
    [...employeesKeys.lists(), params] as const,
  details: () => [...employeesKeys.all, "detail"] as const,
  detail: (id: string) => [...employeesKeys.details(), id] as const,
};

export const referenceKeys = {
  all: ["reference"] as const,
  countries: () => [...referenceKeys.all, "countries"] as const,
  departments: () => [...referenceKeys.all, "departments"] as const,
};
