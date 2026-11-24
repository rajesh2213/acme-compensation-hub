"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getCompensationAnalytics, getOverviewAnalytics } from "./api";
import { analyticsKeys } from "./query-keys";
import { normalizeAnalyticsFilters } from "./url-params";
import type {
  AnalyticsFilters,
  CompensationAnalytics,
  OverviewAnalytics,
} from "./types";

export function useOverviewAnalytics(
  filters: AnalyticsFilters,
): UseQueryResult<OverviewAnalytics> {
  const normalized = normalizeAnalyticsFilters(filters);
  return useQuery({
    queryKey: analyticsKeys.overview(normalized),
    queryFn: ({ signal }) => getOverviewAnalytics(normalized, signal),
  });
}

export function useCompensationAnalytics(
  filters: AnalyticsFilters,
): UseQueryResult<CompensationAnalytics> {
  const normalized = normalizeAnalyticsFilters(filters);
  return useQuery({
    queryKey: analyticsKeys.compensation(normalized),
    queryFn: ({ signal }) => getCompensationAnalytics(normalized, signal),
  });
}
