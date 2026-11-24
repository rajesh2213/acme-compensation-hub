import { describe, expect, it } from "vitest";
import {
  distributionBarPercent,
  formatMoneyDisplay,
  maxEmployeeCount,
} from "./format";

describe("analytics format re-exports", () => {
  it("re-exports shared money formatting", () => {
    expect(formatMoneyDisplay("1234.50", "USD", "en-US")).toBe("1,234.50 USD");
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
