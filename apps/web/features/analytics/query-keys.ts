import { normalizeAnalyticsFilters } from "./url-params";
import type { AnalyticsFilters } from "./types";

export const analyticsKeys = {
  all: ["analytics"] as const,
  overviews: () => [...analyticsKeys.all, "overview"] as const,
  overview: (filters: AnalyticsFilters) =>
    [...analyticsKeys.overviews(), normalizeAnalyticsFilters(filters)] as const,
  compensations: () => [...analyticsKeys.all, "compensation"] as const,
  compensation: (filters: AnalyticsFilters) =>
    [
      ...analyticsKeys.compensations(),
      normalizeAnalyticsFilters(filters),
    ] as const,
};
