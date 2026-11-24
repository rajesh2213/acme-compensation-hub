import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsKeys } from "@/features/analytics/query-keys";
import { useCreateEmployee, useUpdateEmployee } from "./hooks";
import { employeesKeys } from "./query-keys";

const createEmployee = vi.fn();
const updateEmployee = vi.fn();

vi.mock("./api", () => ({
  createEmployee: (...args: unknown[]) => createEmployee(...args),
  updateEmployee: (...args: unknown[]) => updateEmployee(...args),
  listEmployees: vi.fn(),
  getEmployee: vi.fn(),
  listCountries: vi.fn(),
  listDepartments: vi.fn(),
}));

const employeeDetail = {
  id: "e1",
  employeeNumber: "E-1",
  firstName: "Ada",
  lastName: "Lovelace",
  jobTitle: "Engineer",
  departmentId: "22222222-2222-4222-8222-222222222222",
  countryId: "11111111-1111-4111-8111-111111111111",
  status: "ACTIVE" as const,
  hireDate: null,
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
  department: {
    id: "22222222-2222-4222-8222-222222222222",
    code: "ENG",
    name: "Engineering",
  },
  country: {
    id: "11111111-1111-4111-8111-111111111111",
    code: "US",
    name: "United States",
  },
  salary: null,
};

const overviewKey = analyticsKeys.overview({ countryId: "c1" });
const compensationKey = analyticsKeys.compensation({ status: "ACTIVE" });
const listKey = employeesKeys.list({
  page: 1,
  limit: 25,
  sortBy: "employeeNumber",
  sortOrder: "asc",
});

function seedAnalyticsCaches(queryClient: QueryClient) {
  queryClient.setQueryData(overviewKey, { totalEmployees: 1 });
  queryClient.setQueryData(compensationKey, { byCurrency: [] });
  queryClient.setQueryData(listKey, { employees: [], page: 1, limit: 25, total: 0, totalPages: 0 });
}

function CreateProbe({ queryClient }: { queryClient: QueryClient }) {
  const mutation = useCreateEmployee();
  return (
    <div>
      <p data-testid="status">
        {mutation.isSuccess
          ? "success"
          : mutation.isPending
            ? "pending"
            : "idle"}
      </p>
      <p data-testid="cache">
        {queryClient.getQueryData(employeesKeys.detail("e1"))
          ? "detail-present"
          : "detail-empty"}
      </p>
      <button
        type="button"
        onClick={() =>
          void mutation.mutateAsync({
            employeeNumber: "E-1",
            firstName: "Ada",
            lastName: "Lovelace",
            jobTitle: "Engineer",
            departmentId: "22222222-2222-4222-8222-222222222222",
            countryId: "11111111-1111-4111-8111-111111111111",
            status: "ACTIVE",
            hireDate: null,
          })
        }
      >
        Create
      </button>
    </div>
  );
}

function UpdateProbe() {
  const mutation = useUpdateEmployee("e1");
  return (
    <div>
      <p data-testid="status">
        {mutation.isSuccess
          ? "success"
          : mutation.isPending
            ? "pending"
            : "idle"}
      </p>
      <button
        type="button"
        onClick={() =>
          void mutation.mutateAsync({
            firstName: "Augusta",
          })
        }
      >
        Update
      </button>
    </div>
  );
}

describe("employee mutation invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("writes detail cache and invalidates lists + analytics after create", async () => {
    createEmployee.mockResolvedValue(employeeDetail);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedAnalyticsCaches(queryClient);
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <CreateProbe queryClient={queryClient} />
      </QueryClientProvider>,
    );

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Create" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });
    expect(screen.getByTestId("cache")).toHaveTextContent("detail-present");

    await waitFor(() => {
      expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(overviewKey)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(compensationKey)?.isInvalidated).toBe(
        true,
      );
    });
  });

  it("invalidates lists + analytics after update while refreshing detail cache", async () => {
    updateEmployee.mockResolvedValue({
      ...employeeDetail,
      firstName: "Augusta",
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    seedAnalyticsCaches(queryClient);
    queryClient.setQueryData(employeesKeys.detail("e1"), employeeDetail);
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <UpdateProbe />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });
    expect(
      (queryClient.getQueryData(employeesKeys.detail("e1")) as typeof employeeDetail)
        .firstName,
    ).toBe("Augusta");

    await waitFor(() => {
      expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(overviewKey)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(compensationKey)?.isInvalidated).toBe(
        true,
      );
    });
  });
});
