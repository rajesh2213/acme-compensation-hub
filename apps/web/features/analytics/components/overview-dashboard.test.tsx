import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { OverviewDashboard } from "./overview-dashboard";

const getOverviewAnalytics = vi.fn();
const getCompensationAnalytics = vi.fn();

const replace = vi.fn();
let searchParamsString = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/overview",
  useSearchParams: () => new URLSearchParams(searchParamsString),
}));

vi.mock("../api", () => ({
  getOverviewAnalytics: (...args: unknown[]) => getOverviewAnalytics(...args),
  getCompensationAnalytics: (...args: unknown[]) =>
    getCompensationAnalytics(...args),
}));

vi.mock("@/features/employees/hooks", () => ({
  useCountries: () => ({
    data: [
      { id: "c1", code: "US", name: "United States" },
      { id: "c2", code: "IN", name: "India" },
    ],
    isLoading: false,
    error: null,
  }),
  useDepartments: () => ({
    data: [
      { id: "d1", code: "ENG", name: "Engineering" },
      { id: "d2", code: "PEO", name: "People" },
    ],
    isLoading: false,
    error: null,
  }),
}));

const overviewFixture = {
  totalEmployees: 100,
  activeEmployees: 80,
  inactiveEmployees: 15,
  terminatedEmployees: 5,
  byCountry: [
    { id: "c1", name: "United States", employeeCount: 60 },
    { id: "c2", name: "India", employeeCount: 40 },
  ],
  byDepartment: [
    { id: "d1", name: "Engineering", employeeCount: 70 },
    { id: "d2", name: "People", employeeCount: 30 },
  ],
};

const compensationFixture = {
  byCurrency: [
    {
      currency: "USD",
      employeeCount: 50,
      totalAnnualPayroll: "5000000.00",
      averageAnnualSalary: "100000.00",
      minimumAnnualSalary: "60000.00",
      maximumAnnualSalary: "180000.00",
    },
    {
      currency: "EUR",
      employeeCount: 20,
      totalAnnualPayroll: "1800000.00",
      averageAnnualSalary: "90000.00",
      minimumAnnualSalary: "55000.00",
      maximumAnnualSalary: "140000.00",
    },
  ],
  byCountryAndCurrency: [
    {
      countryId: "c1",
      countryName: "United States",
      currency: "USD",
      employeeCount: 50,
      totalAnnualPayroll: "5000000.00",
      averageAnnualSalary: "100000.00",
      minimumAnnualSalary: "60000.00",
      maximumAnnualSalary: "180000.00",
    },
  ],
  byDepartmentAndCurrency: [
    {
      departmentId: "d1",
      departmentName: "Engineering",
      currency: "USD",
      employeeCount: 40,
      totalAnnualPayroll: "4200000.00",
      averageAnnualSalary: "105000.00",
      minimumAnnualSalary: "70000.00",
      maximumAnnualSalary: "180000.00",
    },
  ],
};

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <OverviewDashboard />
    </QueryClientProvider>,
  );
}

describe("OverviewDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsString = "";
    getOverviewAnalytics.mockResolvedValue(overviewFixture);
    getCompensationAnalytics.mockResolvedValue(compensationFixture);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders workforce summary and distributions", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Total employees")).toBeInTheDocument();
    });
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getAllByText("United States").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
    expect(screen.getByText("By country")).toBeInTheDocument();
    expect(screen.getByText("By department")).toBeInTheDocument();
  });

  it("renders compensation grouped by currency without a mixed total", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByLabelText("USD compensation")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("EUR compensation")).toBeInTheDocument();

    const usdPanel = screen.getByLabelText("USD compensation");
    const eurPanel = screen.getByLabelText("EUR compensation");
    expect(within(usdPanel).getAllByText(/USD/).length).toBeGreaterThan(0);
    expect(within(eurPanel).getAllByText(/EUR/).length).toBeGreaterThan(0);
    expect(within(usdPanel).getByText("Total annual payroll")).toBeInTheDocument();
    expect(within(eurPanel).getByText("Total annual payroll")).toBeInTheDocument();
    expect(screen.queryByText(/overall payroll/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/total across currencies/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/never combined across currencies/i),
    ).toBeInTheDocument();
  });

  it("loads lookup options into filters", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByLabelText("Country")).toBeInTheDocument();
    });
    const country = screen.getByLabelText("Country");
    expect(within(country).getByRole("option", { name: "United States" })).toBeInTheDocument();
    expect(within(country).getByRole("option", { name: "India" })).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Department")).getByRole("option", {
        name: "Engineering",
      }),
    ).toBeInTheDocument();
  });

  it("updates the URL when filters change", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(getOverviewAnalytics).toHaveBeenCalled();
    });

    await user.selectOptions(screen.getByLabelText("Country"), "c1");
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/overview?countryId=c1", {
        scroll: false,
      });
    });
  });

  it("passes shared normalized filters to both analytics queries", async () => {
    searchParamsString = "countryId=c1&status=ACTIVE";
    renderDashboard();

    await waitFor(() => {
      expect(getOverviewAnalytics).toHaveBeenCalledWith(
        { countryId: "c1", departmentId: undefined, status: "ACTIVE" },
        expect.anything(),
      );
    });
    expect(getCompensationAnalytics).toHaveBeenCalledWith(
      { countryId: "c1", departmentId: undefined, status: "ACTIVE" },
      expect.anything(),
    );
  });

  it("clears filters from the URL", async () => {
    searchParamsString = "departmentId=d1";
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Clear filters" })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/overview", { scroll: false });
    });
  });

  it("shows empty compensation state", async () => {
    getCompensationAnalytics.mockResolvedValue({
      byCurrency: [],
      byCountryAndCurrency: [],
      byDepartmentAndCurrency: [],
    });
    renderDashboard();

    await waitFor(() => {
      expect(
        screen.getByText(/No salaried employees match the current filters/i),
      ).toBeInTheDocument();
    });
  });

  it("shows empty workforce distributions", async () => {
    getOverviewAnalytics.mockResolvedValue({
      ...overviewFixture,
      totalEmployees: 0,
      activeEmployees: 0,
      inactiveEmployees: 0,
      terminatedEmployees: 0,
      byCountry: [],
      byDepartment: [],
    });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText(/No employees in this view/i).length).toBe(2);
    });
  });

  it("shows error with retry for failed overview", async () => {
    getOverviewAnalytics.mockRejectedValue(
      new ApiError(500, { code: "INTERNAL", message: "Overview failed" }),
    );
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Overview failed")).toBeInTheDocument();
    });
    getOverviewAnalytics.mockResolvedValue(overviewFixture);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(screen.getByText("Total employees")).toBeInTheDocument();
    });
  });
});
