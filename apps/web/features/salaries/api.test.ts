import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { getCurrentSalary } from "./api";

const apiRequest = vi.fn();

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>(
    "@/lib/api-client",
  );
  return {
    ...actual,
    apiRequest: (...args: unknown[]) => apiRequest(...args),
  };
});

vi.mock("@/features/auth/api", () => ({
  fetchCsrfToken: vi.fn().mockResolvedValue("csrf"),
}));

describe("getCurrentSalary", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns salary when present", async () => {
    apiRequest.mockResolvedValue({
      salary: {
        id: "s1",
        employeeId: "e1",
        amount: "120000.00",
        currency: "USD",
        effectiveDate: "2024-01-01",
        version: 1,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    });

    const result = await getCurrentSalary("e1");
    expect(result?.amount).toBe("120000.00");
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/employees/e1/salary",
      expect.objectContaining({ signal: undefined }),
    );
  });

  it("maps only SALARY_NOT_FOUND to null", async () => {
    apiRequest.mockRejectedValue(
      new ApiError(404, {
        code: "SALARY_NOT_FOUND",
        message: "Salary not found for this employee",
      }),
    );

    await expect(getCurrentSalary("e1")).resolves.toBeNull();
  });

  it("rethrows employee NOT_FOUND", async () => {
    apiRequest.mockRejectedValue(
      new ApiError(404, {
        code: "NOT_FOUND",
        message: "Employee not found",
      }),
    );

    await expect(getCurrentSalary("e1")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });
});
