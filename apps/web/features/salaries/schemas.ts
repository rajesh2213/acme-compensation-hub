import { z } from "zod";

const ISO_4217 = new Set(Intl.supportedValuesOf("currency"));

export const isoCalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Must be a valid calendar date");

/**
 * Positive annual amount as a decimal string (NUMERIC(12,2)).
 * Validated with string comparison: never coerced through Number for money math.
 */
export const moneyAmountSchema = z
  .string()
  .trim()
  .regex(
    /^\d+(\.\d{1,2})?$/,
    "Amount must be a positive decimal with at most 2 decimal places",
  )
  .refine((value) => {
    const [wholeRaw, fracRaw = ""] = value.split(".");
    const whole = (wholeRaw ?? "0").replace(/^0+(?=\d)/, "") || "0";
    const frac = fracRaw.padEnd(2, "0").slice(0, 2);
    if (whole === "0" && frac === "00") return false;
    if (whole.length > 10) return false;
    if (whole.length < 10) return true;
    return whole < "9999999999" || (whole === "9999999999" && frac <= "99");
  }, "Amount must be greater than 0 and at most 9999999999.99");

export const currencySchema = z
  .string()
  .trim()
  .min(1, "Select a currency")
  .regex(/^[A-Z]{3}$/, "Currency must be an uppercase ISO 4217 code")
  .refine(
    (value) => ISO_4217.has(value),
    "Currency must be a valid ISO 4217 code",
  );

export const salaryFormSchema = z.object({
  amount: moneyAmountSchema,
  currency: currencySchema,
  effectiveDate: isoCalendarDateSchema,
});

export type SalaryFormValues = z.infer<typeof salaryFormSchema>;

export function toAssignPayload(values: SalaryFormValues) {
  return {
    amount: values.amount.trim(),
    currency: values.currency.trim(),
    effectiveDate: values.effectiveDate.trim(),
  };
}

export function toRevisePayload(
  values: SalaryFormValues,
  expectedVersion: number,
) {
  return {
    ...toAssignPayload(values),
    expectedVersion,
  };
}
