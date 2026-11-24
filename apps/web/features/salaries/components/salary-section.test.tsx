import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { SalarySection } from "./salary-section";

const getCurrentSalary = vi.fn();
const listSalaryRevisions = vi.fn();
const assignSalary = vi.fn();
const reviseSalary = vi.fn();

vi.mock("../api", () => ({
  getCurrentSalary: (...args: unknown[]) => getCurrentSalary(...args),
  listSalaryRevisions: (...args: unknown[]) => listSalaryRevisions(...args),
  assignSalary: (...args: unknown[]) => assignSalary(...args),
  reviseSalary: (...args: unknown[]) => reviseSalary(...args),
}));

vi.mock("@/features/auth/api", () => ({
  fetchCsrfToken: vi.fn().mockResolvedValue("csrf"),
}));

const currentSalary = {
  id: "s1",
  employeeId: "e1",
  amount: "120000.00",
  currency: "USD",
  effectiveDate: "2024-01-01",
  version: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const emptyRevisions = {
  revisions: [] as unknown[],
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 0,
};

function renderSection() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <SalarySection employeeId="e1" />
    </QueryClientProvider>,
  );
}

describe("SalarySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSalaryRevisions.mockResolvedValue(emptyRevisions);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows assign form when salary is unassigned", async () => {
    getCurrentSalary.mockResolvedValue(null);
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("No salary assigned")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Assign salary" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Currency")).toHaveValue("");
    expect(screen.queryByText("Revision history")).not.toBeInTheDocument();
    expect(listSalaryRevisions).not.toHaveBeenCalled();
  });

  it("does not request revision history while salary is unassigned", async () => {
    getCurrentSalary.mockResolvedValue(null);
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("No salary assigned")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(getCurrentSalary).toHaveBeenCalled();
    });
    expect(listSalaryRevisions).not.toHaveBeenCalled();
  });

  it("shows revision history after successful assignment", async () => {
    const assigned = {
      ...currentSalary,
      amount: "90000.00",
      currency: "CAD",
      effectiveDate: "2024-03-01",
      version: 1,
    };

    getCurrentSalary.mockResolvedValue(null);
    assignSalary.mockResolvedValue(assigned);
    listSalaryRevisions.mockResolvedValue({
      revisions: [
        {
          id: "r1",
          previousAmount: null,
          previousCurrency: null,
          newAmount: "90000.00",
          newCurrency: "CAD",
          effectiveDate: "2024-03-01",
          changedAt: "2024-03-01T12:00:00.000Z",
          changedBy: {
            id: "u1",
            email: "hr@acme.test",
            displayName: "HR Admin",
            isActive: true,
          },
        },
      ],
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    });

    const user = userEvent.setup();
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("No salary assigned")).toBeInTheDocument();
    });
    expect(listSalaryRevisions).not.toHaveBeenCalled();

    // After assign success, current salary cache updates; subsequent
    // invalidation refetch should also return the assigned salary.
    getCurrentSalary.mockResolvedValue(assigned);

    await user.type(screen.getByLabelText("Annual amount"), "90000.00");
    await user.selectOptions(screen.getByLabelText("Currency"), "CAD");
    await user.type(screen.getByLabelText("Effective date"), "2024-03-01");
    await user.click(screen.getByRole("button", { name: "Assign salary" }));

    await waitFor(() => {
      expect(assignSalary).toHaveBeenCalledWith("e1", {
        amount: "90000.00",
        currency: "CAD",
        effectiveDate: "2024-03-01",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Revision history")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(listSalaryRevisions).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText("Initial assignment")).toBeInTheDocument();
    });
  });

  it("shows current salary and revise controls", async () => {
    getCurrentSalary.mockResolvedValue(currentSalary);
    listSalaryRevisions.mockResolvedValue({
      revisions: [
        {
          id: "r1",
          previousAmount: null,
          previousCurrency: null,
          newAmount: "120000.00",
          newCurrency: "USD",
          effectiveDate: "2024-01-01",
          changedAt: "2024-01-01T12:00:00.000Z",
          changedBy: {
            id: "u1",
            email: "hr@acme.test",
            displayName: "HR Admin",
            isActive: true,
          },
        },
      ],
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
    });
    renderSection();

    await waitFor(() => {
      expect(screen.getByText(/version 1/)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Initial assignment")).toBeInTheDocument();
    });
    expect(screen.getByText("HR Admin")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Revise salary" }),
    ).toBeInTheDocument();
  });

  it("preserves form values after a failed revise", async () => {
    getCurrentSalary.mockResolvedValue(currentSalary);
    reviseSalary.mockRejectedValue(
      new ApiError(409, {
        code: "SALARY_VERSION_CONFLICT",
        message: "Salary version conflict",
      }),
    );

    const user = userEvent.setup();
    renderSection();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Revise salary" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Revise salary" }));

    const amount = screen.getByLabelText("Annual amount");
    await user.clear(amount);
    await user.type(amount, "130000.00");

    const currency = screen.getByLabelText("Currency");
    await user.selectOptions(currency, "GBP");

    const effective = screen.getByLabelText("Effective date");
    await user.clear(effective);
    await user.type(effective, "2024-08-01");

    await user.click(screen.getByRole("button", { name: "Save revision" }));

    await waitFor(() => {
      expect(
        screen.getByText(/updated elsewhere/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Annual amount")).toHaveValue("130000.00");
    expect(screen.getByLabelText("Currency")).toHaveValue("GBP");
    expect(screen.getByLabelText("Effective date")).toHaveValue("2024-08-01");
  });

  it("sends expectedVersion from fetched salary on revise", async () => {
    getCurrentSalary.mockResolvedValue({ ...currentSalary, version: 3 });
    reviseSalary.mockResolvedValue({
      ...currentSalary,
      amount: "140000.00",
      currency: "EUR",
      version: 4,
      effectiveDate: "2024-09-01",
    });

    const user = userEvent.setup();
    renderSection();

    await waitFor(() => {
      expect(screen.getByText(/version 3/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Revise salary" }));

    const amount = screen.getByLabelText("Annual amount");
    await user.clear(amount);
    await user.type(amount, "140000.00");
    await user.selectOptions(screen.getByLabelText("Currency"), "EUR");
    const effective = screen.getByLabelText("Effective date");
    await user.clear(effective);
    await user.type(effective, "2024-09-01");

    await user.click(screen.getByRole("button", { name: "Save revision" }));

    await waitFor(() => {
      expect(reviseSalary).toHaveBeenCalledWith("e1", {
        amount: "140000.00",
        currency: "EUR",
        effectiveDate: "2024-09-01",
        expectedVersion: 3,
      });
    });
  });

  it("surfaces employee NOT_FOUND from salary query", async () => {
    getCurrentSalary.mockRejectedValue(
      new ApiError(404, { code: "NOT_FOUND", message: "Employee not found" }),
    );
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("Employee not found.")).toBeInTheDocument();
    });
  });
});
