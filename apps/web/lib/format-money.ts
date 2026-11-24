/**
 * Shared monetary display formatting.
 * Keeps amounts as decimal strings; groups integers with BigInt + Intl.
 * Never uses Number/parseFloat/parseInt on monetary values.
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
