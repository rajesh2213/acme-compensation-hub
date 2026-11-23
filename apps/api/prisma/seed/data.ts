/** Deterministic reference pools for ACME Compensation Hub seeding. */

export const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "IN", name: "India" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "SG", name: "Singapore" },
  { code: "IE", name: "Ireland" },
] as const;

export const DEPARTMENTS = [
  { code: "ENG", name: "Engineering" },
  { code: "HR", name: "Human Resources" },
  { code: "FIN", name: "Finance" },
  { code: "SALES", name: "Sales" },
  { code: "MKT", name: "Marketing" },
  { code: "OPS", name: "Operations" },
  { code: "PROD", name: "Product" },
  { code: "LEGAL", name: "Legal" },
] as const;

export const JOB_TITLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Engineering Manager",
  "Product Manager",
  "HR Specialist",
  "HR Manager",
  "Financial Analyst",
  "Accountant",
  "Sales Representative",
  "Account Executive",
  "Marketing Specialist",
  "Operations Coordinator",
  "Legal Counsel",
  "Data Analyst",
  "Customer Success Manager",
] as const;

/**
 * Annual salary bands by currency (amounts in integer cents).
 * Currency is assigned independently of country — no inferred FX mapping.
 */
export const ANNUAL_SALARY_BANDS = [
  { currency: "USD", minCents: 48_000_00, maxCents: 185_000_00 },
  { currency: "EUR", minCents: 42_000_00, maxCents: 160_000_00 },
  { currency: "GBP", minCents: 38_000_00, maxCents: 145_000_00 },
  { currency: "INR", minCents: 600_000_00, maxCents: 4_500_000_00 },
  { currency: "CAD", minCents: 55_000_00, maxCents: 170_000_00 },
  { currency: "AUD", minCents: 55_000_00, maxCents: 175_000_00 },
] as const;

/** Synthetic first names. */
export const FIRST_NAMES = [
  "Avery", "Blake", "Cameron", "Dakota", "Eden", "Finley", "Gray", "Harper",
  "Indigo", "Jordan", "Kai", "Logan", "Morgan", "Noah", "Oakley", "Parker",
  "Quinn", "Reese", "Sage", "Taylor", "Uma", "Val", "Winter", "Xander",
  "Yael", "Zion", "Alex", "Blair", "Casey", "Drew", "Ellis", "Frankie",
] as const;

/** Synthetic last names. */
export const LAST_NAMES = [
  "North", "Rivera", "Stone", "Brooks", "Hayes", "Cole", "Reed", "West",
  "Lane", "Shore", "Vale", "Frost", "Ash", "Glen", "Hart", "Pike",
  "Quinn", "Rowe", "Shaw", "Tate", "Underwood", "Vance", "Walsh", "York",
  "Adler", "Bell", "Cross", "Dale", "East", "Field",
] as const;

export const EMPLOYEE_COUNT = 10_000;
export const EXTRA_REVISION_EMPLOYEE_COUNT = 75;
