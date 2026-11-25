import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { formatSalary } from "../format";
import { EmployeeDirectory } from "./employee-directory";

const replace = vi.fn();
const listEmployees = vi.fn();
const listCountries = vi.fn();
const listDepartments = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/employees",
  useSearchParams: () => new URLSearchParams(),
}));

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
  listEmployees: (...args: unknown[]) => listEmployees(...args),
  listCountries: (...args: unknown[]) => listCountries(...args),
  listDepartments: (...args: unknown[]) => listDepartments(...args),
  getEmployee: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
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
    amount: "126000.00",
    currency: "AUD",
    effectiveDate: "2026-11-25",
    version: 2,
  },
};

function renderDirectory() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EmployeeDirectory />
    </QueryClientProvider>,
  );
}

describe("EmployeeDirectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCountries.mockResolvedValue([
      { id: "c1", code: "US", name: "United States" },
    ]);
    listDepartments.mockResolvedValue([
      { id: "d1", code: "ENG", name: "Engineering" },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading then populated rows", async () => {
    let resolveList: (value: unknown) => void = () => undefined;
    listEmployees.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    renderDirectory();
    expect(screen.getByText("Loading employees…")).toBeInTheDocument();

    resolveList({
      employees: [employee],
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    });

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });
    expect(screen.getByText("E-001")).toBeInTheDocument();
    expect(screen.getByText("1 employee")).toBeInTheDocument();
    expect(
      screen.getByText(formatSalary(employee.salary)),
    ).toBeInTheDocument();
  });

  it("shows em dash when list salary is missing", async () => {
    listEmployees.mockResolvedValue({
      employees: [{ ...employee, salary: null }],
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    });

    renderDirectory();

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });
    expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    listEmployees.mockResolvedValue({
      employees: [],
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 0,
    });

    renderDirectory();
    await waitFor(() => {
      expect(screen.getByText("No employees match")).toBeInTheDocument();
    });
  });

  it("shows error state with retry", async () => {
    listEmployees.mockRejectedValue(
      new ApiError(500, { code: "INTERNAL_ERROR", message: "Boom" }),
    );

    renderDirectory();
    await waitFor(() => {
      expect(screen.getByText("Boom")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("updates country filter in the URL and resets page", async () => {
    listEmployees.mockResolvedValue({
      employees: [employee],
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    });
    const user = userEvent.setup();

    renderDirectory();
    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Country"), "c1");

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        expect.stringContaining("countryId=c1"),
      );
    });
  });
});
