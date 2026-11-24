import { describe, expect, it } from "vitest";
import {
  analyticsFiltersEqual,
  hasActiveAnalyticsFilters,
  normalizeAnalyticsFilters,
  parseAnalyticsFilters,
  serializeAnalyticsFilters,
} from "./url-params";

describe("analytics url-params", () => {
  it("normalizes empty strings and invalid status", () => {
    expect(
      normalizeAnalyticsFilters({
        countryId: "  ",
        departmentId: "d1",
        status: "NOPE" as never,
      }),
    ).toEqual({
      countryId: undefined,
      departmentId: "d1",
      status: undefined,
    });
  });

  it("parses and serializes filters round-trip", () => {
    const filters = {
      countryId: "11111111-1111-4111-8111-111111111111",
      departmentId: "22222222-2222-4222-8222-222222222222",
      status: "ACTIVE" as const,
    };
    const serialized = serializeAnalyticsFilters(filters);
    expect(serialized.get("countryId")).toBe(filters.countryId);
    expect(serialized.get("departmentId")).toBe(filters.departmentId);
    expect(serialized.get("status")).toBe("ACTIVE");
    expect(parseAnalyticsFilters(serialized)).toEqual(filters);
  });

  it("omits unset filters from the URL", () => {
    const serialized = serializeAnalyticsFilters({});
    expect(serialized.toString()).toBe("");
    expect(hasActiveAnalyticsFilters({})).toBe(false);
    expect(
      hasActiveAnalyticsFilters({ status: "INACTIVE" }),
    ).toBe(true);
  });

  it("compares filters after normalization", () => {
    expect(
      analyticsFiltersEqual(
        { countryId: "c1", status: "ACTIVE" },
        { countryId: "c1", departmentId: undefined, status: "ACTIVE" },
      ),
    ).toBe(true);
    expect(
      analyticsFiltersEqual(
        { countryId: "c1" },
        { countryId: "c2" },
      ),
    ).toBe(false);
  });
});
