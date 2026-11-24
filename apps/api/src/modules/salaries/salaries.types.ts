export type SafeChangedByUser = {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
};

export type CurrentSalaryDto = {
  id: string;
  employeeId: string;
  amount: string;
  currency: string;
  effectiveDate: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SalaryRevisionDto = {
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
  revisions: SalaryRevisionDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
