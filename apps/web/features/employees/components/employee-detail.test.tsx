import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { EmployeeDetailView } from "./employee-detail";

const getEmployee = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../api", () => ({
  getEmployee: (...args: unknown[]) => getEmployee(...args),
  listEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  listCountries: vi.fn(),
  listDepartments: vi.fn(),
}));

const employee = {
  id: "e1",
  employeeNumber: "E-001",
  firstName: "Ada",
  lastName: "Lovelace",
  jobTitle: "Engineer",
  departmentId: "d1",
  countryId: "c1",
  status: "ACTIVE" as const,
  hireDate: "2020-01-01",
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
  department: { id: "d1", code: "ENG", name: "Engineering" },
  country: { id: "c1", code: "US", name: "United States" },
  salary: {
    id: "s1",
    amount: "120000.00",
    currency: "USD",
    effectiveDate: "2024-01-01",
    version: 1,
  },
};

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EmployeeDetailView employeeId="e1" />
    </QueryClientProvider>,
  );
}

describe("EmployeeDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders employee detail and salary summary", async () => {
    getEmployee.mockResolvedValue(employee);
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText(/USD · effective 2024-01-01/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit/i })).toHaveAttribute(
      "href",
      "/employees/e1/edit",
    );
  });

  it("shows not-found state", async () => {
    getEmployee.mockRejectedValue(
      new ApiError(404, { code: "NOT_FOUND", message: "Employee not found" }),
    );
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText("Employee not found.")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });
});
