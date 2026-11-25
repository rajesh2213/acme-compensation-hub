export type EmploymentStatus = "ACTIVE" | "INACTIVE" | "TERMINATED";

export type EmployeeSortField =
  | "employeeNumber"
  | "firstName"
  | "lastName"
  | "hireDate"
  | "createdAt";

export type SortOrder = "asc" | "desc";

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

export type EmployeeListItem = {
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
  salary: SalaryDto | null;
};

export type EmployeeDetail = EmployeeListItem;

export type EmployeeListResult = {
  employees: EmployeeListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type EmployeeListParams = {
  page: number;
  limit: number;
  search?: string;
  countryId?: string;
  departmentId?: string;
  jobTitle?: string;
  status?: EmploymentStatus;
  sortBy: EmployeeSortField;
  sortOrder: SortOrder;
};

export type CreateEmployeeInput = {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  departmentId: string;
  countryId: string;
  status: EmploymentStatus;
  hireDate?: string | null;
};

export type UpdateEmployeeInput = {
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  departmentId?: string;
  countryId?: string;
  status?: EmploymentStatus;
  hireDate?: string | null;
};

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "TERMINATED",
];

export const EMPLOYEE_SORT_FIELDS: EmployeeSortField[] = [
  "employeeNumber",
  "firstName",
  "lastName",
  "hireDate",
  "createdAt",
];

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
