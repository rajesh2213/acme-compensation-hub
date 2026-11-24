/**
 * Display helpers only. Monetary values stay decimal strings in the data layer.
 * Integer grouping uses BigInt + Intl — never Number/parseFloat for money.
 */

export function formatEmployeeCount(count: number): string {
  return new Intl.NumberFormat(undefined).format(count);
}

/**
 * Locale decimal separator for display assembly.
 * Uses a non-monetary probe via formatToParts; never converts the money amount.
 */
function localeDecimalSeparator(locale?: string): string {
  const parts = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).formatToParts(1.1);
  return parts.find((part) => part.type === "decimal")?.value ?? ".";
}

/**
 * Formats a decimal money string for display.
 * Splits integer/fractional parts as strings; groups the integer with BigInt.
 * Fractional digits are preserved exactly (padded to two) and joined with the
 * locale-specific decimal separator from formatToParts.
 */
export function formatMoneyDisplay(
  amount: string,
  currency: string,
  locale?: string,
): string {
  const [wholeRaw = "0", fracRaw = ""] = amount.split(".");
  const wholeDigits = (wholeRaw.replace(/^0+(?=\d)/, "") || "0").replace(
    /[^\d]/g,
    "",
  );
  const frac = `${fracRaw}00`.slice(0, 2).replace(/[^\d]/g, "").padEnd(2, "0");

  const groupedWhole = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(BigInt(wholeDigits || "0"));

  const decimal = localeDecimalSeparator(locale);
  return `${groupedWhole}${decimal}${frac} ${currency}`;
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
