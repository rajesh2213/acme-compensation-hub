import { apiRequest } from "@/lib/api-client";
import { normalizeAnalyticsFilters } from "./url-params";
import type {
  AnalyticsFilters,
  CompensationAnalytics,
  OverviewAnalytics,
} from "./types";

function toSearchParams(filters: AnalyticsFilters): string {
  const normalized = normalizeAnalyticsFilters(filters);
  const search = new URLSearchParams();
  if (normalized.countryId) search.set("countryId", normalized.countryId);
  if (normalized.departmentId) {
    search.set("departmentId", normalized.departmentId);
  }
  if (normalized.status) search.set("status", normalized.status);
  return search.toString();
}

export async function getOverviewAnalytics(
  filters: AnalyticsFilters,
  signal?: AbortSignal,
): Promise<OverviewAnalytics> {
  const qs = toSearchParams(filters);
  const path = qs
    ? `/api/v1/analytics/overview?${qs}`
    : "/api/v1/analytics/overview";
  return apiRequest<OverviewAnalytics>(path, { signal });
}

export async function getCompensationAnalytics(
  filters: AnalyticsFilters,
  signal?: AbortSignal,
): Promise<CompensationAnalytics> {
  const qs = toSearchParams(filters);
  const path = qs
    ? `/api/v1/analytics/compensation?${qs}`
    : "/api/v1/analytics/compensation";
  return apiRequest<CompensationAnalytics>(path, { signal });
}
