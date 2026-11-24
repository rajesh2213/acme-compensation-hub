import { apiRequest, ApiError } from "@/lib/api-client";
import { fetchCsrfToken } from "@/features/auth/api";
import type {
  AssignSalaryInput,
  CurrentSalary,
  ReviseSalaryInput,
  SalaryRevisionListResult,
  SalaryRevisionsParams,
} from "./types";

function salaryBase(employeeId: string): string {
  return `/api/v1/employees/${employeeId}/salary`;
}

/**
 * Fetches current salary. Maps only `SALARY_NOT_FOUND` to null.
 * Employee `NOT_FOUND` and other errors are rethrown.
 */
export async function getCurrentSalary(
  employeeId: string,
  signal?: AbortSignal,
): Promise<CurrentSalary | null> {
  try {
    const data = await apiRequest<{ salary: CurrentSalary }>(
      salaryBase(employeeId),
      { signal },
    );
    return data.salary;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.code === "SALARY_NOT_FOUND"
    ) {
      return null;
    }
    throw error;
  }
}

export async function assignSalary(
  employeeId: string,
  body: AssignSalaryInput,
): Promise<CurrentSalary> {
  const csrfToken = await fetchCsrfToken();
  const data = await apiRequest<{ salary: CurrentSalary }>(
    salaryBase(employeeId),
    {
      method: "POST",
      csrfToken,
      body,
    },
  );
  return data.salary;
}

export async function reviseSalary(
  employeeId: string,
  body: ReviseSalaryInput,
): Promise<CurrentSalary> {
  const csrfToken = await fetchCsrfToken();
  const data = await apiRequest<{ salary: CurrentSalary }>(
    salaryBase(employeeId),
    {
      method: "PATCH",
      csrfToken,
      body,
    },
  );
  return data.salary;
}

export async function listSalaryRevisions(
  employeeId: string,
  params: SalaryRevisionsParams,
  signal?: AbortSignal,
): Promise<SalaryRevisionListResult> {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  return apiRequest<SalaryRevisionListResult>(
    `${salaryBase(employeeId)}/revisions?${search.toString()}`,
    { signal },
  );
}
