import type { CurrentSalary, SalaryRevision } from "./types";

/**
 * Formats a decimal money string for display grouping only.
 * Does not convert currencies or use money values in business arithmetic.
 */
export function formatMoneyAmount(amount: string, currency: string): string {
  const [wholeRaw, fracRaw = ""] = amount.split(".");
  const whole = wholeRaw || "0";
  const frac = (fracRaw + "00").slice(0, 2);

  try {
    const asNumber = Number(`${whole}.${frac}`);
    if (Number.isFinite(asNumber)) {
      return `${new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(asNumber)} ${currency}`;
    }
  } catch {
    // fall through
  }
  return `${whole}.${frac} ${currency}`;
}

export function formatSalaryHeadline(salary: CurrentSalary): string {
  return formatMoneyAmount(salary.amount, salary.currency);
}

export function formatEffectiveDate(value: string): string {
  return value;
}

export function formatChangedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPreviousSalary(revision: SalaryRevision): string {
  if (revision.previousAmount === null || revision.previousCurrency === null) {
    return "Initial assignment";
  }
  return formatMoneyAmount(revision.previousAmount, revision.previousCurrency);
}

export function formatNewSalary(revision: SalaryRevision): string {
  return formatMoneyAmount(revision.newAmount, revision.newCurrency);
}
