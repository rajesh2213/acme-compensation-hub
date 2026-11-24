/**
 * Display helpers for analytics. Monetary formatting is shared via lib/format-money.
 */

export { formatMoneyDisplay } from "@/lib/format-money";

export function formatEmployeeCount(count: number): string {
  return new Intl.NumberFormat(undefined).format(count);
}

export function formatStatusLabel(
  status: "ACTIVE" | "INACTIVE" | "TERMINATED",
): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "TERMINATED":
      return "Terminated";
    default:
      return status;
  }
}

/** Max employeeCount in a distribution list; 0 when empty or all zeros. */
export function maxEmployeeCount(
  buckets: ReadonlyArray<{ employeeCount: number }>,
): number {
  let max = 0;
  for (const bucket of buckets) {
    if (bucket.employeeCount > max) max = bucket.employeeCount;
  }
  return max;
}

/**
 * Width percent for a CSS bar, relative to the list maximum.
 * Returns 0 when max is 0 or count is 0 (safe empty / zero-count handling).
 */
export function distributionBarPercent(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0;
  return Math.min(100, (count / max) * 100);
}
