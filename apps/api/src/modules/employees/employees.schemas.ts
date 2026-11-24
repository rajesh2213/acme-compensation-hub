import { z } from "zod";

export const employmentStatusSchema = z.enum(["ACTIVE", "INACTIVE", "TERMINATED"]);

export const employeeSortFieldSchema = z.enum([
  "employeeNumber",
  "firstName",
  "lastName",
  "hireDate",
  "createdAt",
]);

/** Strict YYYY-MM-DD calendar date (rejects 2024-02-30, etc.). */
export const isoCalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "hireDate must be YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "hireDate must be a valid calendar date");

const uuidSchema = z.string().uuid();

export const listEmployeesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(200).optional(),
  countryId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  jobTitle: z.string().trim().min(1).max(200).optional(),
  status: employmentStatusSchema.optional(),
  sortBy: employeeSortFieldSchema.default("employeeNumber"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const employeeIdParamsSchema = z.object({
  id: uuidSchema,
});

export const createEmployeeBodySchema = z.object({
  employeeNumber: z.string().trim().min(1).max(64),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  jobTitle: z.string().trim().min(1).max(200),
  departmentId: uuidSchema,
  countryId: uuidSchema,
  status: employmentStatusSchema.default("ACTIVE"),
  hireDate: isoCalendarDateSchema.optional().nullable(),
});

export const updateEmployeeBodySchema = z
  .object({
    employeeNumber: z.string().trim().min(1).max(64).optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    jobTitle: z.string().trim().min(1).max(200).optional(),
    departmentId: uuidSchema.optional(),
    countryId: uuidSchema.optional(),
    status: employmentStatusSchema.optional(),
    hireDate: isoCalendarDateSchema.optional().nullable(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });

export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
export type CreateEmployeeBody = z.infer<typeof createEmployeeBodySchema>;
export type UpdateEmployeeBody = z.infer<typeof updateEmployeeBodySchema>;
