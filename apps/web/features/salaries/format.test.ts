import { describe, expect, it, vi } from "vitest";
import { formatMoneyAmount, formatSalaryHeadline } from "./format";

describe("salary money formatters", () => {
  it("formats ordinary and large amounts without Number", () => {
    expect(formatMoneyAmount("120000.50", "USD", "en-US")).toBe(
      "120,000.50 USD",
    );
    expect(formatMoneyAmount("9999999999.99", "EUR", "en-US")).toBe(
      "9,999,999,999.99 EUR",
    );
  });

  it("formats headline from current salary", () => {
    expect(
      formatSalaryHeadline({
        id: "s1",
        employeeId: "e1",
        amount: "85000.00",
        currency: "GBP",
        effectiveDate: "2024-01-01",
        version: 1,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }),
    ).toMatch(/85/);
    expect(
      formatSalaryHeadline({
        id: "s1",
        employeeId: "e1",
        amount: "85000.00",
        currency: "GBP",
        effectiveDate: "2024-01-01",
        version: 1,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }),
    ).toContain("GBP");
  });

  it("does not coerce monetary amounts through Number", () => {
    const numberSpy = vi.spyOn(globalThis, "Number");
    formatMoneyAmount("9999999999.99", "USD", "en-US");
    const monetaryCalls = numberSpy.mock.calls.filter(
      ([value]) => value === "9999999999.99",
    );
    expect(monetaryCalls).toEqual([]);
    numberSpy.mockRestore();
  });
});
