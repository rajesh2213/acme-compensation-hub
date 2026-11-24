import { z } from "zod";
import { Prisma } from "../../generated/prisma/client.js";

/** Strict YYYY-MM-DD calendar date. */
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

const MAX_AMOUNT = new Prisma.Decimal("9999999999.99");
const ZERO = new Prisma.Decimal("0");

/**
 * Positive annual amount as a decimal string (NUMERIC(12,2)).
 * Never coerced through JavaScript Number.
 */
export const moneyAmountSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a positive decimal with at most 2 decimal places")
  .refine((value) => {
    const amount = new Prisma.Decimal(value);
    return amount.greaterThan(ZERO) && amount.lessThanOrEqualTo(MAX_AMOUNT);
  }, "Amount must be greater than 0 and at most 9999999999.99");

const ISO_4217_CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

export const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "Currency must be an uppercase ISO 4217 code")
  .refine(
    (value) => ISO_4217_CURRENCIES.has(value),
    "Currency must be a valid ISO 4217 code",
  );

export const employeeIdParamsSchema = z.object({
  employeeId: z.string().uuid(),
});

export const assignSalaryBodySchema = z.object({
  amount: moneyAmountSchema,
  currency: currencySchema,
  effectiveDate: isoCalendarDateSchema,
});

export const reviseSalaryBodySchema = z.object({
  amount: moneyAmountSchema,
  currency: currencySchema,
  effectiveDate: isoCalendarDateSchema,
  expectedVersion: z.coerce.number().int().positive(),
});

export const listRevisionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type AssignSalaryBody = z.infer<typeof assignSalaryBodySchema>;
export type ReviseSalaryBody = z.infer<typeof reviseSalaryBodySchema>;
export type ListRevisionsQuery = z.infer<typeof listRevisionsQuerySchema>;
