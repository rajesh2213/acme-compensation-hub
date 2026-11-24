import { describe, expect, it, vi } from "vitest";
import { formatSalary, salarySummary } from "./format";

describe("employee money formatters", () => {
  it("formats salary with shared exact money helper", () => {
    expect(
      formatSalary({
        id: "s1",
        amount: "1234.50",
        currency: "USD",
        effectiveDate: "2024-01-01",
        version: 1,
      }),
    ).toBe(
      `${new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 0,
        useGrouping: true,
      }).format(BigInt("1234"))}${
        new Intl.NumberFormat(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
          .formatToParts(1.1)
          .find((p) => p.type === "decimal")?.value ?? "."
      }50 USD`,
    );
  });

  it("returns em dash when salary is missing", () => {
    expect(formatSalary(null)).toBe("—");
    expect(formatSalary(undefined)).toBe("—");
  });

  it("does not coerce monetary amounts through Number", () => {
    const numberSpy = vi.spyOn(globalThis, "Number");
    formatSalary({
      id: "s1",
      amount: "9999999999.99",
      currency: "EUR",
      effectiveDate: "2024-01-01",
      version: 1,
    });
    expect(
      numberSpy.mock.calls.filter(([value]) => value === "9999999999.99"),
    ).toEqual([]);
    numberSpy.mockRestore();
  });

  it("builds salary summary with effective date", () => {
    expect(
      salarySummary({
        id: "e1",
        employeeNumber: "E-1",
        firstName: "Ada",
        lastName: "Lovelace",
        jobTitle: "Engineer",
        departmentId: "d1",
        countryId: "c1",
        status: "ACTIVE",
        hireDate: null,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
        department: { id: "d1", code: "ENG", name: "Engineering" },
        country: { id: "c1", code: "US", name: "United States" },
        salary: {
          id: "s1",
          amount: "100.00",
          currency: "USD",
          effectiveDate: "2024-06-01",
          version: 1,
        },
      }),
    ).toContain("effective 2024-06-01");
  });
});
