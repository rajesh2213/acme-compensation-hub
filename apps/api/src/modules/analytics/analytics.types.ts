export type StatusCounts = {
  ACTIVE: number;
  INACTIVE: number;
  TERMINATED: number;
};

export type DistributionBucket = {
  id: string;
  name: string;
  employeeCount: number;
};

export type OverviewAnalyticsDto = {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  terminatedEmployees: number;
  byCountry: DistributionBucket[];
  byDepartment: DistributionBucket[];
};

export type CompensationStatsDto = {
  currency: string;
  employeeCount: number;
  totalAnnualPayroll: string;
  averageAnnualSalary: string;
  minimumAnnualSalary: string;
  maximumAnnualSalary: string;
};

export type CompensationByCountryDto = CompensationStatsDto & {
  countryId: string;
  countryName: string;
};

export type CompensationByDepartmentDto = CompensationStatsDto & {
  departmentId: string;
  departmentName: string;
};

export type CompensationAnalyticsDto = {
  byCurrency: CompensationStatsDto[];
  byCountryAndCurrency: CompensationByCountryDto[];
  byDepartmentAndCurrency: CompensationByDepartmentDto[];
};
