import { z } from "zod";

export const employmentStatusSchema = z.enum(["ACTIVE", "INACTIVE", "TERMINATED"]);

export const analyticsFiltersQuerySchema = z.object({
  countryId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  status: employmentStatusSchema.optional(),
});

export type AnalyticsFiltersQuery = z.infer<typeof analyticsFiltersQuerySchema>;
