import { describe, expect, it } from "vitest";
import {
  parseEmployeeListParams,
  serializeEmployeeListParams,
} from "./url-params";

describe("employee list URL params", () => {
  it("parses canonical query values with defaults", () => {
    const params = parseEmployeeListParams(
      new URLSearchParams(
        "page=2&limit=50&search=ada&countryId=11111111-1111-1111-1111-111111111111&status=ACTIVE&sortBy=lastName&sortOrder=desc",
      ),
    );

    expect(params).toEqual({
      page: 2,
      limit: 50,
      search: "ada",
      countryId: "11111111-1111-1111-1111-111111111111",
      departmentId: undefined,
      jobTitle: undefined,
      status: "ACTIVE",
      sortBy: "lastName",
      sortOrder: "desc",
    });
  });

  it("omits default values when serializing", () => {
    const qs = serializeEmployeeListParams({
      page: 1,
      limit: 25,
      sortBy: "employeeNumber",
      sortOrder: "asc",
      search: "ada",
    }).toString();

    expect(qs).toBe("search=ada");
  });

  it("falls back to safe defaults for invalid values", () => {
    const params = parseEmployeeListParams(
      new URLSearchParams("page=0&limit=999&sortBy=nope&status=WEIRD"),
    );
    expect(params.page).toBe(1);
    expect(params.limit).toBe(25);
    expect(params.sortBy).toBe("employeeNumber");
    expect(params.status).toBeUndefined();
  });
});
