import { Prisma } from "../../src/generated/prisma/client.js";

/** Convert integer cents to Prisma Decimal without floating-point math. */
export function centsToDecimal(cents: number): Prisma.Decimal {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = abs % 100;
  const text = `${negative ? "-" : ""}${whole}.${frac.toString().padStart(2, "0")}`;
  return new Prisma.Decimal(text);
}

/** Raise amount in cents by basis points (e.g. 500 = 5%). Integer-only. */
export function raiseCents(cents: number, basisPoints: number): number {
  return cents + Math.trunc((cents * basisPoints) / 10_000);
}

export function annualAmountCents(
  employeeIndex: number,
  minCents: number,
  maxCents: number,
): number {
  const span = maxCents - minCents;
  // Dollar-aligned: multiple of 100 cents
  const offset = ((employeeIndex * 7919) % Math.trunc(span / 100)) * 100;
  return minCents + offset;
}
