import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsKeys } from "@/features/analytics/query-keys";
import { employeesKeys } from "@/features/employees/query-keys";
import { useAssignSalary, useReviseSalary } from "./hooks";
import { salariesKeys } from "./query-keys";

const overviewKey = analyticsKeys.overview({ countryId: "c1" });
const compensationKey = analyticsKeys.compensation({ status: "ACTIVE" });

const assignSalary = vi.fn();
const reviseSalary = vi.fn();

vi.mock("./api", () => ({
  assignSalary: (...args: unknown[]) => assignSalary(...args),
  reviseSalary: (...args: unknown[]) => reviseSalary(...args),
  getCurrentSalary: vi.fn(),
  listSalaryRevisions: vi.fn(),
}));

const salary = {
  id: "s1",
  employeeId: "e1",
  amount: "120000.00",
  currency: "USD",
  effectiveDate: "2024-01-01",
  version: 2,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-06-01T00:00:00.000Z",
};

function AssignProbe({ queryClient }: { queryClient: QueryClient }) {
  const mutation = useAssignSalary("e1");
  return (
    <div>
      <p data-testid="status">
        {mutation.isSuccess ? "success" : mutation.isPending ? "pending" : "idle"}
      </p>
      <button
        type="button"
        onClick={() =>
          void mutation.mutateAsync({
            amount: "90000.00",
            currency: "EUR",
            effectiveDate: "2024-03-01",
          })
        }
      >
        Assign
      </button>
      <p data-testid="current">
        {queryClient.getQueryData(salariesKeys.current("e1"))
          ? "current-set"
          : "current-empty"}
      </p>
      <p data-testid="detail">
        {queryClient.getQueryState(employeesKeys.detail("e1"))?.isInvalidated
          ? "detail-invalidated"
          : "detail-clean"}
      </p>
    </div>
  );
}

function ReviseProbe({ queryClient }: { queryClient: QueryClient }) {
  const mutation = useReviseSalary("e1");
  return (
    <div>
      <p data-testid="status">
        {mutation.isSuccess ? "success" : mutation.isPending ? "pending" : "idle"}
      </p>
      <button
        type="button"
        onClick={() =>
          void mutation.mutateAsync({
            amount: "130000.00",
            currency: "GBP",
            effectiveDate: "2024-07-01",
            expectedVersion: 1,
          })
        }
      >
        Revise
      </button>
      <p data-testid="revisions-key">
        {JSON.stringify(salariesKeys.revisionsForEmployee("e1"))}
      </p>
      <p data-testid="current-amount">
        {(queryClient.getQueryData(salariesKeys.current("e1")) as typeof salary | undefined)
          ?.amount ?? "none"}
      </p>
    </div>
  );
}

describe("salary mutation invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("sets current salary and invalidates detail + compensation analytics after assign", async () => {
    assignSalary.mockResolvedValue(salary);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(employeesKeys.detail("e1"), { id: "e1" });
    queryClient.setQueryData(overviewKey, { totalEmployees: 1 });
    queryClient.setQueryData(compensationKey, { byCurrency: [] });

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <AssignProbe queryClient={queryClient} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Assign" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });
    expect(screen.getByTestId("current")).toHaveTextContent("current-set");
    expect(assignSalary).toHaveBeenCalledWith("e1", {
      amount: "90000.00",
      currency: "EUR",
      effectiveDate: "2024-03-01",
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryState(employeesKeys.detail("e1"))?.isInvalidated,
      ).toBe(true);
      expect(queryClient.getQueryState(compensationKey)?.isInvalidated).toBe(
        true,
      );
    });
    expect(
      queryClient.getQueryState(salariesKeys.revisionsForEmployee("e1"))
        ?.isInvalidated ?? true,
    ).toBe(true);
    expect(queryClient.getQueryState(overviewKey)?.isInvalidated).not.toBe(
      true,
    );
  });

  it("updates current salary and invalidates compensation analytics after revise", async () => {
    reviseSalary.mockResolvedValue({
      ...salary,
      amount: "130000.00",
      currency: "GBP",
      version: 2,
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(salariesKeys.current("e1"), {
      ...salary,
      version: 1,
    });
    queryClient.setQueryData(
      salariesKeys.revisions("e1", { page: 2, limit: 25 }),
      { revisions: [], page: 2, limit: 25, total: 0, totalPages: 0 },
    );
    queryClient.setQueryData(overviewKey, { totalEmployees: 1 });
    queryClient.setQueryData(compensationKey, { byCurrency: [] });

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <ReviseProbe queryClient={queryClient} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Revise" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });
    expect(screen.getByTestId("current-amount")).toHaveTextContent("130000.00");
    expect(reviseSalary).toHaveBeenCalledWith("e1", {
      amount: "130000.00",
      currency: "GBP",
      effectiveDate: "2024-07-01",
      expectedVersion: 1,
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryState(
          salariesKeys.revisions("e1", { page: 2, limit: 25 }),
        )?.isInvalidated,
      ).toBe(true);
      expect(queryClient.getQueryState(compensationKey)?.isInvalidated).toBe(
        true,
      );
    });
    expect(queryClient.getQueryState(overviewKey)?.isInvalidated).not.toBe(
      true,
    );
  });
});
