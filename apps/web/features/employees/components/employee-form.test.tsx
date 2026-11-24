import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { EmployeeForm } from "./employee-form";

const countries = [
  { id: "11111111-1111-4111-8111-111111111111", code: "US", name: "United States" },
];
const departments = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    code: "ENG",
    name: "Engineering",
  },
];

afterEach(() => {
  cleanup();
});

describe("EmployeeForm", () => {
  it("validates required fields", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <EmployeeForm
        mode="create"
        countries={countries}
        departments={departments}
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create employee" }));

    await waitFor(() => {
      expect(
        screen.getByText("Employee number is required"),
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a valid create payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <EmployeeForm
        mode="create"
        countries={countries}
        departments={departments}
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );

    await user.type(screen.getByLabelText("Employee number"), "E-100");
    await user.type(screen.getByLabelText("First name"), "Ada");
    await user.type(screen.getByLabelText("Last name"), "Lovelace");
    await user.type(screen.getByLabelText("Job title"), "Engineer");
    await user.selectOptions(
      screen.getByLabelText("Department"),
      departments[0]!.id,
    );
    await user.selectOptions(
      screen.getByLabelText("Country"),
      countries[0]!.id,
    );
    await user.click(screen.getByRole("button", { name: "Create employee" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        employeeNumber: "E-100",
        firstName: "Ada",
        lastName: "Lovelace",
        jobTitle: "Engineer",
        departmentId: departments[0]!.id,
        countryId: countries[0]!.id,
        status: "ACTIVE",
        hireDate: null,
      });
    });
  });

  it("maps EMPLOYEE_NUMBER_CONFLICT to the employee number field and keeps values", async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(409, {
        code: "EMPLOYEE_NUMBER_CONFLICT",
        message: "An employee with this employee number already exists",
      }),
    );
    const user = userEvent.setup();

    render(
      <EmployeeForm
        mode="create"
        countries={countries}
        departments={departments}
        onSubmit={onSubmit}
        onCancel={() => undefined}
      />,
    );

    await user.type(screen.getByLabelText("Employee number"), "E-100");
    await user.type(screen.getByLabelText("First name"), "Ada");
    await user.type(screen.getByLabelText("Last name"), "Lovelace");
    await user.type(screen.getByLabelText("Job title"), "Engineer");
    await user.selectOptions(
      screen.getByLabelText("Department"),
      departments[0]!.id,
    );
    await user.selectOptions(
      screen.getByLabelText("Country"),
      countries[0]!.id,
    );
    await user.click(screen.getByRole("button", { name: "Create employee" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "An employee with this employee number already exists",
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText("First name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Employee number")).toHaveValue("E-100");
  });

  it("populates edit values from the initial employee", () => {
    render(
      <EmployeeForm
        mode="edit"
        countries={countries}
        departments={departments}
        initialEmployee={{
          id: "e1",
          employeeNumber: "E-001",
          firstName: "Ada",
          lastName: "Lovelace",
          jobTitle: "Engineer",
          departmentId: departments[0]!.id,
          countryId: countries[0]!.id,
          status: "INACTIVE",
          hireDate: "2020-01-01",
          createdAt: "2020-01-01T00:00:00.000Z",
          updatedAt: "2020-01-01T00:00:00.000Z",
          department: departments[0]!,
          country: countries[0]!,
          salary: null,
        }}
        onSubmit={vi.fn()}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Employee number")).toHaveValue("E-001");
    expect(screen.getByLabelText("First name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Employment status")).toHaveValue("INACTIVE");
    expect(screen.getByLabelText("Hire date")).toHaveValue("2020-01-01");
  });
});
