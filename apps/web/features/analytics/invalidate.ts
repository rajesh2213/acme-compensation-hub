import type { QueryClient } from "@tanstack/react-query";
import { analyticsKeys } from "./query-keys";

/** Invalidate every cached overview filter variant. */
export function invalidateAnalyticsOverviews(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: analyticsKeys.overviews(),
  });
}

/** Invalidate every cached compensation filter variant. */
export function invalidateAnalyticsCompensations(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: analyticsKeys.compensations(),
  });
}

/** Employee mutations can affect headcount and compensation groupings. */
export async function invalidateAnalyticsAfterEmployeeMutation(
  queryClient: QueryClient,
) {
  await Promise.all([
    invalidateAnalyticsOverviews(queryClient),
    invalidateAnalyticsCompensations(queryClient),
  ]);
}

/** Salary mutations affect compensation aggregates only. */
export async function invalidateAnalyticsAfterSalaryMutation(
  queryClient: QueryClient,
) {
  await invalidateAnalyticsCompensations(queryClient);
}
