import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { SalaryForm } from "./salary-form";

const existingSalary = {
  id: "s1",
  employeeId: "e1",
  amount: "120000.00",
  currency: "EUR",
  effectiveDate: "2024-01-01",
  version: 2,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("SalaryForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("starts assignment with no currency selected", () => {
    render(
      <SalaryForm mode="assign" onSubmit={vi.fn().mockResolvedValue(undefined)} />,
    );

    expect(screen.getByLabelText("Currency")).toHaveValue("");
    expect(
      screen.getByRole("option", { name: "Select currency" }),
    ).toBeInTheDocument();
  });

  it("rejects assignment submit without a currency", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SalaryForm mode="assign" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Annual amount"), "90000.00");
    await user.type(screen.getByLabelText("Effective date"), "2024-03-01");
    await user.click(screen.getByRole("button", { name: "Assign salary" }));

    await waitFor(() => {
      expect(screen.getByText("Select a currency")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("defaults revise form to the existing salary currency", () => {
    render(
      <SalaryForm
        mode="revise"
        initialSalary={existingSalary}
        expectedVersion={2}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByLabelText("Currency")).toHaveValue("EUR");
    expect(screen.getByLabelText("Annual amount")).toHaveValue("120000.00");
  });

  it("surfaces SALARY_ALREADY_EXISTS without clearing form values", async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(409, {
        code: "SALARY_ALREADY_EXISTS",
        message: "A salary already exists for this employee",
      }),
    );
    const user = userEvent.setup();

    render(<SalaryForm mode="assign" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Annual amount"), "90000.00");
    await user.selectOptions(screen.getByLabelText("Currency"), "USD");
    await user.type(screen.getByLabelText("Effective date"), "2024-03-01");
    await user.click(screen.getByRole("button", { name: "Assign salary" }));

    await waitFor(() => {
      expect(
        screen.getByText("A salary already exists for this employee"),
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Annual amount")).toHaveValue("90000.00");
    expect(screen.getByLabelText("Currency")).toHaveValue("USD");
    expect(screen.getByLabelText("Effective date")).toHaveValue("2024-03-01");
  });
});
