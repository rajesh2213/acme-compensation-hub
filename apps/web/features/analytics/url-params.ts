import { EMPLOYMENT_STATUSES, type EmploymentStatus } from "@/features/employees/types";
import type { AnalyticsFilters } from "./types";

export const ANALYTICS_PARAM_KEYS = [
  "countryId",
  "departmentId",
  "status",
] as const;

function isStatus(value: string): value is EmploymentStatus {
  return (EMPLOYMENT_STATUSES as string[]).includes(value);
}

/** Normalize filters so both analytics queries share identical keys. */
export function normalizeAnalyticsFilters(
  filters: AnalyticsFilters,
): AnalyticsFilters {
  const countryId = filters.countryId?.trim() || undefined;
  const departmentId = filters.departmentId?.trim() || undefined;
  const status =
    filters.status && isStatus(filters.status) ? filters.status : undefined;
  return { countryId, departmentId, status };
}

export function parseAnalyticsFilters(
  searchParams: URLSearchParams,
): AnalyticsFilters {
  const statusRaw = searchParams.get("status")?.trim();
  return normalizeAnalyticsFilters({
    countryId: searchParams.get("countryId")?.trim() || undefined,
    departmentId: searchParams.get("departmentId")?.trim() || undefined,
    status: statusRaw && isStatus(statusRaw) ? statusRaw : undefined,
  });
}

export function serializeAnalyticsFilters(
  filters: AnalyticsFilters,
): URLSearchParams {
  const normalized = normalizeAnalyticsFilters(filters);
  const search = new URLSearchParams();
  if (normalized.countryId) search.set("countryId", normalized.countryId);
  if (normalized.departmentId) {
    search.set("departmentId", normalized.departmentId);
  }
  if (normalized.status) search.set("status", normalized.status);
  return search;
}

export function analyticsFiltersEqual(
  a: AnalyticsFilters,
  b: AnalyticsFilters,
): boolean {
  const left = normalizeAnalyticsFilters(a);
  const right = normalizeAnalyticsFilters(b);
  return (
    left.countryId === right.countryId &&
    left.departmentId === right.departmentId &&
    left.status === right.status
  );
}

export function hasActiveAnalyticsFilters(filters: AnalyticsFilters): boolean {
  const normalized = normalizeAnalyticsFilters(filters);
  return Boolean(
    normalized.countryId || normalized.departmentId || normalized.status,
  );
}
