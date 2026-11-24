import {
  EMPLOYEE_SORT_FIELDS,
  EMPLOYMENT_STATUSES,
  PAGE_SIZE_OPTIONS,
  type EmployeeListParams,
  type EmployeeSortField,
  type EmploymentStatus,
  type SortOrder,
} from "./types";

const DEFAULT_PARAMS: EmployeeListParams = {
  page: 1,
  limit: 25,
  sortBy: "employeeNumber",
  sortOrder: "asc",
};

function isSortField(value: string): value is EmployeeSortField {
  return (EMPLOYEE_SORT_FIELDS as string[]).includes(value);
}

function isStatus(value: string): value is EmploymentStatus {
  return (EMPLOYMENT_STATUSES as string[]).includes(value);
}

function isSortOrder(value: string): value is SortOrder {
  return value === "asc" || value === "desc";
}

function isPageSize(value: number): boolean {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

/** Canonical keys written to the URL. */
export const LIST_PARAM_KEYS = [
  "page",
  "limit",
  "search",
  "countryId",
  "departmentId",
  "jobTitle",
  "status",
  "sortBy",
  "sortOrder",
] as const;

export function parseEmployeeListParams(
  searchParams: URLSearchParams,
): EmployeeListParams {
  const pageRaw = Number(searchParams.get("page") ?? DEFAULT_PARAMS.page);
  const limitRaw = Number(searchParams.get("limit") ?? DEFAULT_PARAMS.limit);
  const sortByRaw = searchParams.get("sortBy") ?? DEFAULT_PARAMS.sortBy;
  const sortOrderRaw = searchParams.get("sortOrder") ?? DEFAULT_PARAMS.sortOrder;
  const search = searchParams.get("search")?.trim() || undefined;
  const countryId = searchParams.get("countryId")?.trim() || undefined;
  const departmentId = searchParams.get("departmentId")?.trim() || undefined;
  const jobTitle = searchParams.get("jobTitle")?.trim() || undefined;
  const statusRaw = searchParams.get("status")?.trim();

  return {
    page: Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1,
    limit: Number.isInteger(limitRaw) && isPageSize(limitRaw) ? limitRaw : 25,
    search,
    countryId,
    departmentId,
    jobTitle,
    status: statusRaw && isStatus(statusRaw) ? statusRaw : undefined,
    sortBy: isSortField(sortByRaw) ? sortByRaw : "employeeNumber",
    sortOrder: isSortOrder(sortOrderRaw) ? sortOrderRaw : "asc",
  };
}

export function serializeEmployeeListParams(
  params: EmployeeListParams,
): URLSearchParams {
  const search = new URLSearchParams();
  if (params.page !== 1) search.set("page", String(params.page));
  if (params.limit !== 25) search.set("limit", String(params.limit));
  if (params.search) search.set("search", params.search);
  if (params.countryId) search.set("countryId", params.countryId);
  if (params.departmentId) search.set("departmentId", params.departmentId);
  if (params.jobTitle) search.set("jobTitle", params.jobTitle);
  if (params.status) search.set("status", params.status);
  if (params.sortBy !== "employeeNumber") search.set("sortBy", params.sortBy);
  if (params.sortOrder !== "asc") search.set("sortOrder", params.sortOrder);
  return search;
}

export function employeeListParamsEqual(
  a: EmployeeListParams,
  b: EmployeeListParams,
): boolean {
  return (
    a.page === b.page &&
    a.limit === b.limit &&
    a.search === b.search &&
    a.countryId === b.countryId &&
    a.departmentId === b.departmentId &&
    a.jobTitle === b.jobTitle &&
    a.status === b.status &&
    a.sortBy === b.sortBy &&
    a.sortOrder === b.sortOrder
  );
}

export { DEFAULT_PARAMS as DEFAULT_EMPLOYEE_LIST_PARAMS };
