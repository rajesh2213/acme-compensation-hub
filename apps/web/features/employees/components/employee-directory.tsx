"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { formatSalary, formatStatus, fullName } from "../format";
import { useCountries, useDepartments, useEmployeeList } from "../hooks";
import {
  EMPLOYEE_SORT_FIELDS,
  EMPLOYMENT_STATUSES,
  PAGE_SIZE_OPTIONS,
  type EmployeeListParams,
  type EmployeeSortField,
  type SortOrder,
} from "../types";
import {
  employeeListParamsEqual,
  parseEmployeeListParams,
  serializeEmployeeListParams,
} from "../url-params";
import { QueryEmpty, QueryError, QueryLoading } from "./query-state";
import { StatusBadge } from "./status-badge";

function sortLabel(field: EmployeeSortField): string {
  switch (field) {
    case "employeeNumber":
      return "Employee #";
    case "firstName":
      return "First name";
    case "lastName":
      return "Last name";
    case "hireDate":
      return "Hire date";
    case "createdAt":
      return "Created";
    default:
      return field;
  }
}

export function EmployeeDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlParams = useMemo(
    () => parseEmployeeListParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [searchInput, setSearchInput] = useState(urlParams.search ?? "");
  const [jobTitleInput, setJobTitleInput] = useState(urlParams.jobTitle ?? "");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const debouncedJobTitle = useDebouncedValue(jobTitleInput.trim(), 300);

  useEffect(() => {
    setSearchInput(urlParams.search ?? "");
  }, [urlParams.search]);

  useEffect(() => {
    setJobTitleInput(urlParams.jobTitle ?? "");
  }, [urlParams.jobTitle]);

  const queryParams = useMemo<EmployeeListParams>(() => {
    const search = debouncedSearch || undefined;
    const jobTitle = debouncedJobTitle || undefined;
    const filtersChanged =
      search !== (urlParams.search ?? undefined) ||
      jobTitle !== (urlParams.jobTitle ?? undefined);
    return {
      ...urlParams,
      search,
      jobTitle,
      page: filtersChanged ? 1 : urlParams.page,
    };
  }, [urlParams, debouncedSearch, debouncedJobTitle]);

  useEffect(() => {
    if (employeeListParamsEqual(queryParams, urlParams)) return;
    const qs = serializeEmployeeListParams(queryParams).toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }, [queryParams, urlParams, pathname, router]);

  const listQuery = useEmployeeList(queryParams);
  const countriesQuery = useCountries();
  const departmentsQuery = useDepartments();

  function patchParams(patch: Partial<EmployeeListParams>, resetPage = true) {
    const next: EmployeeListParams = {
      ...queryParams,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? queryParams.page),
    };
    const qs = serializeEmployeeListParams(next).toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function toggleSort(field: EmployeeSortField) {
    if (queryParams.sortBy === field) {
      patchParams({
        sortOrder: queryParams.sortOrder === "asc" ? "desc" : "asc",
      });
      return;
    }
    patchParams({ sortBy: field, sortOrder: "asc" });
  }

  const errorMessage =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? "Unable to load employees"
        : null;

  const employees = listQuery.data?.employees ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 0;
  const page = listQuery.data?.page ?? queryParams.page;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Search and filter the HR employee directory. Results are paged from
            the server.
          </p>
        </div>
        <Button asChild>
          <Link href="/employees/new">
            <Plus className="size-4" />
            New employee
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 rounded-md border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-2 xl:col-span-2">
          <Label htmlFor="employee-search">Search</Label>
          <Input
            id="employee-search"
            value={searchInput}
            placeholder="Number, first or last name"
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-country">Country</Label>
          <Select
            id="filter-country"
            value={queryParams.countryId ?? ""}
            onChange={(event) =>
              patchParams({
                countryId: event.target.value || undefined,
              })
            }
          >
            <option value="">All countries</option>
            {(countriesQuery.data ?? []).map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-department">Department</Label>
          <Select
            id="filter-department"
            value={queryParams.departmentId ?? ""}
            onChange={(event) =>
              patchParams({
                departmentId: event.target.value || undefined,
              })
            }
          >
            <option value="">All departments</option>
            {(departmentsQuery.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-status">Status</Label>
          <Select
            id="filter-status"
            value={queryParams.status ?? ""}
            onChange={(event) =>
              patchParams({
                status: (event.target.value || undefined) as
                  | EmployeeListParams["status"]
                  | undefined,
              })
            }
          >
            <option value="">All statuses</option>
            {EMPLOYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-job-title">Job title</Label>
          <Input
            id="filter-job-title"
            value={jobTitleInput}
            placeholder="Exact title"
            onChange={(event) => setJobTitleInput(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {listQuery.isFetching && !listQuery.data
            ? "Loading…"
            : `${total.toLocaleString()} employee${total === 1 ? "" : "s"}`}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="page-size" className="text-muted-foreground">
              Page size
            </Label>
            <Select
              id="page-size"
              className="w-24"
              value={String(queryParams.limit)}
              onChange={(event) =>
                patchParams({ limit: Number(event.target.value) })
              }
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-by" className="text-muted-foreground">
              Sort
            </Label>
            <Select
              id="sort-by"
              className="w-40"
              value={queryParams.sortBy}
              onChange={(event) =>
                patchParams({
                  sortBy: event.target.value as EmployeeSortField,
                })
              }
            >
              {EMPLOYEE_SORT_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {sortLabel(field)}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Sort order"
              className="w-36"
              value={queryParams.sortOrder}
              onChange={(event) =>
                patchParams({
                  sortOrder: event.target.value as SortOrder,
                })
              }
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </Select>
          </div>
        </div>
      </div>

      {listQuery.isLoading ? (
        <QueryLoading label="Loading employees…" />
      ) : errorMessage ? (
        <QueryError
          message={errorMessage}
          onRetry={() => void listQuery.refetch()}
        />
      ) : employees.length === 0 ? (
        <QueryEmpty
          title="No employees match"
          description="Adjust search or filters, or create a new employee record."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <thead className="border-b border-border bg-muted/60">
              <tr>
                <SortableHeader
                  field="employeeNumber"
                  active={queryParams.sortBy}
                  order={queryParams.sortOrder}
                  onSort={toggleSort}
                >
                  Employee #
                </SortableHeader>
                <SortableHeader
                  field="lastName"
                  active={queryParams.sortBy}
                  order={queryParams.sortOrder}
                  onSort={toggleSort}
                >
                  Name
                </SortableHeader>
                <th className="px-3 py-2.5 font-medium text-muted-foreground">
                  Job title
                </th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground">
                  Department
                </th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground">
                  Country
                </th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground">
                  Salary
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-2.5 font-mono text-xs">
                    <Link
                      href={`/employees/${employee.id}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {employee.employeeNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/employees/${employee.id}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {fullName(employee)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {employee.jobTitle}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {employee.department.name}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {employee.country.name}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={employee.status} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatSalary(employee.salary)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
            {listQuery.isFetching ? " · Updating…" : ""}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1 || listQuery.isFetching}
              onClick={() => patchParams({ page: page - 1 }, false)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages || listQuery.isFetching}
              onClick={() => patchParams({ page: page + 1 }, false)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortableHeader({
  field,
  active,
  order,
  onSort,
  children,
}: {
  field: EmployeeSortField;
  active: EmployeeSortField;
  order: SortOrder;
  onSort: (field: EmployeeSortField) => void;
  children: ReactNode;
}) {
  const isActive = active === field;
  const Icon = !isActive ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="px-3 py-2.5">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground",
          isActive && "text-foreground",
        )}
        onClick={() => onSort(field)}
      >
        {children}
        <Icon className="size-3.5" aria-hidden />
      </button>
    </th>
  );
}
