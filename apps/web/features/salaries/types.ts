export type SafeChangedByUser = {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
};

export type CurrentSalary = {
  id: string;
  employeeId: string;
  amount: string;
  currency: string;
  effectiveDate: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SalaryRevision = {
  id: string;
  previousAmount: string | null;
  previousCurrency: string | null;
  newAmount: string;
  newCurrency: string;
  effectiveDate: string;
  changedAt: string;
  changedBy: SafeChangedByUser;
};

export type SalaryRevisionListResult = {
  revisions: SalaryRevision[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SalaryRevisionsParams = {
  page: number;
  limit: number;
};

export type AssignSalaryInput = {
  amount: string;
  currency: string;
  effectiveDate: string;
};

export type ReviseSalaryInput = {
  amount: string;
  currency: string;
  effectiveDate: string;
  expectedVersion: number;
};

export const COMMON_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "CAD",
  "AUD",
  "SGD",
  "CHF",
  "JPY",
  "NZD",
] as const;

export const REVISION_PAGE_SIZE = 25;
