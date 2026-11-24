export type EmploymentStatus = "ACTIVE" | "INACTIVE" | "TERMINATED";

export type EmployeeSortField =
  | "employeeNumber"
  | "firstName"
  | "lastName"
  | "hireDate"
  | "createdAt";

export type RefDto = {
  id: string;
  code: string;
  name: string;
};

export type SalaryDto = {
  id: string;
  amount: string;
  currency: string;
  effectiveDate: string;
  version: number;
};

export type EmployeeListItemDto = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  departmentId: string;
  countryId: string;
  status: EmploymentStatus;
  hireDate: string | null;
  createdAt: string;
  updatedAt: string;
  department: RefDto;
  country: RefDto;
};

export type EmployeeDetailDto = EmployeeListItemDto & {
  salary: SalaryDto | null;
};

export type EmployeeListResult = {
  employees: EmployeeListItemDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
