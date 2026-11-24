import { apiRequest } from "@/lib/api-client";
import { fetchCsrfToken } from "@/features/auth/api";
import type {
  CreateEmployeeInput,
  EmployeeDetail,
  EmployeeListParams,
  EmployeeListResult,
  RefDto,
  UpdateEmployeeInput,
} from "./types";

function toSearchParams(params: EmployeeListParams): string {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));
  search.set("sortBy", params.sortBy);
  search.set("sortOrder", params.sortOrder);
  if (params.search) search.set("search", params.search);
  if (params.countryId) search.set("countryId", params.countryId);
  if (params.departmentId) search.set("departmentId", params.departmentId);
  if (params.jobTitle) search.set("jobTitle", params.jobTitle);
  if (params.status) search.set("status", params.status);
  return search.toString();
}

export async function listEmployees(
  params: EmployeeListParams,
  signal?: AbortSignal,
): Promise<EmployeeListResult> {
  const qs = toSearchParams(params);
  return apiRequest<EmployeeListResult>(`/api/v1/employees?${qs}`, { signal });
}

export async function getEmployee(
  id: string,
  signal?: AbortSignal,
): Promise<EmployeeDetail> {
  const data = await apiRequest<{ employee: EmployeeDetail }>(
    `/api/v1/employees/${id}`,
    { signal },
  );
  return data.employee;
}

export async function createEmployee(
  body: CreateEmployeeInput,
): Promise<EmployeeDetail> {
  const csrfToken = await fetchCsrfToken();
  const data = await apiRequest<{ employee: EmployeeDetail }>(
    "/api/v1/employees",
    {
      method: "POST",
      csrfToken,
      body,
    },
  );
  return data.employee;
}

export async function updateEmployee(
  id: string,
  body: UpdateEmployeeInput,
): Promise<EmployeeDetail> {
  const csrfToken = await fetchCsrfToken();
  const data = await apiRequest<{ employee: EmployeeDetail }>(
    `/api/v1/employees/${id}`,
    {
      method: "PATCH",
      csrfToken,
      body,
    },
  );
  return data.employee;
}

export async function listCountries(signal?: AbortSignal): Promise<RefDto[]> {
  const data = await apiRequest<{ countries: RefDto[] }>(
    "/api/v1/countries",
    { signal },
  );
  return data.countries;
}

export async function listDepartments(signal?: AbortSignal): Promise<RefDto[]> {
  const data = await apiRequest<{ departments: RefDto[] }>(
    "/api/v1/departments",
    { signal },
  );
  return data.departments;
}
