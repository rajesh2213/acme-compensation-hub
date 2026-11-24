import type { EmploymentStatus } from "@/features/employees/types";

export type { EmploymentStatus };

export type AnalyticsFilters = {
  countryId?: string;
  departmentId?: string;
  status?: EmploymentStatus;
};

export type DistributionBucket = {
  id: string;
  name: string;
  employeeCount: number;
};

export type OverviewAnalytics = {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  terminatedEmployees: number;
  byCountry: DistributionBucket[];
  byDepartment: DistributionBucket[];
};

export type CompensationStats = {
  currency: string;
  employeeCount: number;
  totalAnnualPayroll: string;
  averageAnnualSalary: string;
  minimumAnnualSalary: string;
  maximumAnnualSalary: string;
};

export type CompensationByCountry = CompensationStats & {
  countryId: string;
  countryName: string;
};

export type CompensationByDepartment = CompensationStats & {
  departmentId: string;
  departmentName: string;
};

export type CompensationAnalytics = {
  byCurrency: CompensationStats[];
  byCountryAndCurrency: CompensationByCountry[];
  byDepartmentAndCurrency: CompensationByDepartment[];
};
