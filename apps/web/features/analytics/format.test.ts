import { describe, expect, it, vi } from "vitest";
import {
  distributionBarPercent,
  formatMoneyDisplay,
  maxEmployeeCount,
} from "./format";

describe("formatMoneyDisplay", () => {
  it("formats en-US with comma grouping and dot decimal", () => {
    expect(formatMoneyDisplay("1234.50", "USD", "en-US")).toBe("1,234.50 USD");
  });

  it("formats de-DE with period grouping and comma decimal", () => {
    expect(formatMoneyDisplay("1234.50", "EUR", "de-DE")).toBe("1.234,50 EUR");
  });

  it("formats en-IN using the runtime's grouping for that locale", () => {
    const grouped = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(BigInt("1234"));
    const decimal =
      new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
        .formatToParts(1.1)
        .find((part) => part.type === "decimal")?.value ?? ".";
    expect(formatMoneyDisplay("1234.50", "INR", "en-IN")).toBe(
      `${grouped}${decimal}50 INR`,
    );
  });

  it("formats the large maximum amount without Number conversion", () => {
    expect(formatMoneyDisplay("9999999999.99", "EUR", "en-US")).toBe(
      "9,999,999,999.99 EUR",
    );
  });

  it("preserves small decimal precision and zero-pads fraction digits", () => {
    expect(formatMoneyDisplay("0.01", "GBP", "en-US")).toBe("0.01 GBP");
    expect(formatMoneyDisplay("1200.5", "CAD", "en-US")).toBe("1,200.50 CAD");
  });

  it("does not convert monetary values through JavaScript Number or parseFloat", () => {
    const numberSpy = vi.spyOn(globalThis, "Number");
    const parseFloatSpy = vi.spyOn(globalThis, "parseFloat");

    formatMoneyDisplay("9999999999.99", "USD", "en-US");
    formatMoneyDisplay("0.01", "USD", "de-DE");
    formatMoneyDisplay("1234.50", "INR", "en-IN");

    // Locale probe may use 1.1 via formatToParts; monetary amounts must not.
    const monetaryCalls = numberSpy.mock.calls.filter(([value]) => {
      if (typeof value !== "string") return false;
      return /^(9999999999\.99|0\.01|1234\.50)$/.test(value);
    });
    expect(monetaryCalls).toEqual([]);
    expect(parseFloatSpy).not.toHaveBeenCalled();

    numberSpy.mockRestore();
    parseFloatSpy.mockRestore();
  });
});

describe("distribution helpers", () => {
  it("scales bars relative to the list maximum and handles zeros", () => {
    expect(maxEmployeeCount([])).toBe(0);
    expect(maxEmployeeCount([{ employeeCount: 0 }, { employeeCount: 0 }])).toBe(
      0,
    );
    expect(
      maxEmployeeCount([{ employeeCount: 10 }, { employeeCount: 40 }]),
    ).toBe(40);

    expect(distributionBarPercent(0, 40)).toBe(0);
    expect(distributionBarPercent(20, 0)).toBe(0);
    expect(distributionBarPercent(20, 40)).toBe(50);
    expect(distributionBarPercent(40, 40)).toBe(100);
  });
});
