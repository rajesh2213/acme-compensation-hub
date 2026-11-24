import { formatMoneyDisplay } from "@/lib/format-money";
import type { CurrentSalary, SalaryRevision } from "./types";

/**
 * Formats a decimal money string for display grouping only.
 * Delegates to the shared BigInt/locale formatter — no Number coercion.
 */
export function formatMoneyAmount(
  amount: string,
  currency: string,
  locale?: string,
): string {
  return formatMoneyDisplay(amount, currency, locale);
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
