import { describe, expect, it } from "vitest";
import { moneyAmountSchema, salaryFormSchema } from "./schemas";

describe("moneyAmountSchema", () => {
  it("accepts valid decimal strings", () => {
    expect(moneyAmountSchema.parse("1000")).toBe("1000");
    expect(moneyAmountSchema.parse("120000.50")).toBe("120000.50");
    expect(moneyAmountSchema.parse("0.01")).toBe("0.01");
    expect(moneyAmountSchema.parse("9999999999.99")).toBe("9999999999.99");
  });

  it("rejects zero, negatives, and excess precision", () => {
    expect(moneyAmountSchema.safeParse("0").success).toBe(false);
    expect(moneyAmountSchema.safeParse("0.00").success).toBe(false);
    expect(moneyAmountSchema.safeParse("-5.00").success).toBe(false);
    expect(moneyAmountSchema.safeParse("12.345").success).toBe(false);
    expect(moneyAmountSchema.safeParse("10000000000").success).toBe(false);
  });
});

describe("salaryFormSchema", () => {
  it("requires uppercase ISO currency and calendar date", () => {
    const ok = salaryFormSchema.safeParse({
      amount: "50000.00",
      currency: "EUR",
      effectiveDate: "2024-06-15",
    });
    expect(ok.success).toBe(true);

    expect(
      salaryFormSchema.safeParse({
        amount: "50000.00",
        currency: "usd",
        effectiveDate: "2024-06-15",
      }).success,
    ).toBe(false);

    expect(
      salaryFormSchema.safeParse({
        amount: "50000.00",
        currency: "USD",
        effectiveDate: "2024-02-30",
      }).success,
    ).toBe(false);
  });

  it("rejects empty currency", () => {
    const result = salaryFormSchema.safeParse({
      amount: "50000.00",
      currency: "",
      effectiveDate: "2024-06-15",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Select a currency");
    }
  });
});
