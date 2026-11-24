import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateEmployee } from "./hooks";
import { employeesKeys } from "./query-keys";

const createEmployee = vi.fn();

vi.mock("./api", () => ({
  createEmployee: (...args: unknown[]) => createEmployee(...args),
  listEmployees: vi.fn(),
  getEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  listCountries: vi.fn(),
  listDepartments: vi.fn(),
}));

function Probe({ queryClient }: { queryClient: QueryClient }) {
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

describe("employee mutation invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("writes detail cache after create", async () => {
    createEmployee.mockResolvedValue({
      id: "e1",
      employeeNumber: "E-1",
      firstName: "Ada",
      lastName: "Lovelace",
      jobTitle: "Engineer",
      departmentId: "22222222-2222-4222-8222-222222222222",
      countryId: "11111111-1111-4111-8111-111111111111",
      status: "ACTIVE",
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
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <Probe queryClient={queryClient} />
      </QueryClientProvider>,
    );

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Create" }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });
    expect(screen.getByTestId("cache")).toHaveTextContent("detail-present");
  });
});
