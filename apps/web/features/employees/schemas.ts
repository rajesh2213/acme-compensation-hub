import { z } from "zod";

export const employmentStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "TERMINATED",
]);

export const isoCalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Hire date must be YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Hire date must be a valid calendar date");

const uuidSchema = z.string().uuid("Select a valid option");

export const employeeFormSchema = z.object({
  employeeNumber: z.string().trim().min(1, "Employee number is required").max(64),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  jobTitle: z.string().trim().min(1, "Job title is required").max(200),
  departmentId: uuidSchema,
  countryId: uuidSchema,
  status: employmentStatusSchema,
  hireDate: z.string().trim(),
}).superRefine((values, ctx) => {
  if (!values.hireDate) return;
  const result = isoCalendarDateSchema.safeParse(values.hireDate);
  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error.issues[0]?.message ?? "Invalid hire date",
      path: ["hireDate"],
    });
  }
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export function toEmployeePayload(values: EmployeeFormValues) {
  return {
    employeeNumber: values.employeeNumber.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    jobTitle: values.jobTitle.trim(),
    departmentId: values.departmentId,
    countryId: values.countryId,
    status: values.status,
    hireDate: values.hireDate.trim() ? values.hireDate.trim() : null,
  };
}
