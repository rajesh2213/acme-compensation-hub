import { describe, expect, it, vi } from "vitest";
import { formatMoneyDisplay } from "./format-money";

describe("formatMoneyDisplay", () => {
  it("formats ordinary values", () => {
    expect(formatMoneyDisplay("1234.50", "USD", "en-US")).toBe("1,234.50 USD");
  });

  it("formats large values beyond Number.MAX_SAFE_INTEGER without Number", () => {
    expect(formatMoneyDisplay("9007199254740993.99", "USD", "en-US")).toBe(
      `${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
        useGrouping: true,
      }).format(BigInt("9007199254740993"))}.99 USD`,
    );
  });

  it("formats zero", () => {
    expect(formatMoneyDisplay("0", "USD", "en-US")).toBe("0.00 USD");
    expect(formatMoneyDisplay("0.00", "EUR", "en-US")).toBe("0.00 EUR");
  });

  it("formats fractional amounts and pads to two digits", () => {
    expect(formatMoneyDisplay("0.01", "GBP", "en-US")).toBe("0.01 GBP");
    expect(formatMoneyDisplay("1200.5", "CAD", "en-US")).toBe("1,200.50 CAD");
  });

  it("uses locale-specific grouping and decimal separators", () => {
    expect(formatMoneyDisplay("1234.50", "EUR", "de-DE")).toBe("1.234,50 EUR");
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

  it("appends different currency codes", () => {
    expect(formatMoneyDisplay("100.00", "JPY", "en-US")).toBe("100.00 JPY");
    expect(formatMoneyDisplay("100.00", "CHF", "en-US")).toBe("100.00 CHF");
  });

  it("does not convert monetary values through Number or parseFloat", () => {
    const numberSpy = vi.spyOn(globalThis, "Number");
    const parseFloatSpy = vi.spyOn(globalThis, "parseFloat");
    const parseIntSpy = vi.spyOn(globalThis, "parseInt");

    formatMoneyDisplay("9999999999.99", "USD", "en-US");
    formatMoneyDisplay("0.01", "USD", "de-DE");
    formatMoneyDisplay("9007199254740993.99", "EUR", "en-US");

    const monetaryCalls = numberSpy.mock.calls.filter(([value]) => {
      if (typeof value !== "string") return false;
      return /^(9999999999\.99|0\.01|9007199254740993\.99)$/.test(value);
    });
    expect(monetaryCalls).toEqual([]);
    expect(parseFloatSpy).not.toHaveBeenCalled();
    expect(parseIntSpy).not.toHaveBeenCalled();

    numberSpy.mockRestore();
    parseFloatSpy.mockRestore();
    parseIntSpy.mockRestore();
  });
});
