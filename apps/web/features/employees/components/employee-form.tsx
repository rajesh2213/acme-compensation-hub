"use client";

import { useEffect, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import {
  employeeFormSchema,
  toEmployeePayload,
  type EmployeeFormValues,
} from "../schemas";
import type { CreateEmployeeInput, EmployeeDetail, RefDto } from "../types";
import { EMPLOYMENT_STATUSES } from "../types";
import { formatStatus } from "../format";

export type EmployeeFormProps = {
  mode: "create" | "edit";
  countries: RefDto[];
  departments: RefDto[];
  initialEmployee?: EmployeeDetail;
  submitting?: boolean;
  onSubmit: (values: CreateEmployeeInput) => Promise<void>;
  onCancel: () => void;
};

function defaultsFromEmployee(
  employee?: EmployeeDetail,
): EmployeeFormValues {
  if (!employee) {
    return {
      employeeNumber: "",
      firstName: "",
      lastName: "",
      jobTitle: "",
      departmentId: "",
      countryId: "",
      status: "ACTIVE",
      hireDate: "",
    };
  }
  return {
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    jobTitle: employee.jobTitle,
    departmentId: employee.departmentId,
    countryId: employee.countryId,
    status: employee.status,
    hireDate: employee.hireDate ?? "",
  };
}

export function EmployeeForm({
  mode,
  countries,
  departments,
  initialEmployee,
  submitting = false,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: defaultsFromEmployee(initialEmployee),
  });

  useEffect(() => {
    if (initialEmployee) {
      reset(defaultsFromEmployee(initialEmployee));
    }
  }, [initialEmployee, reset]);

  const busy = submitting || isSubmitting;

  async function submit(values: EmployeeFormValues) {
    try {
      await onSubmit(toEmployeePayload(values));
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "EMPLOYEE_NUMBER_CONFLICT") {
          setError("employeeNumber", {
            type: "server",
            message: error.message,
          });
          return;
        }
        if (error.code === "DEPARTMENT_NOT_FOUND") {
          setError("departmentId", { type: "server", message: error.message });
          return;
        }
        if (error.code === "COUNTRY_NOT_FOUND") {
          setError("countryId", { type: "server", message: error.message });
          return;
        }
        if (error.code === "VALIDATION_ERROR") {
          setError("root", { type: "server", message: error.message });
          return;
        }
        setError("root", {
          type: "server",
          message: error.message || "Request failed",
        });
        return;
      }
      setError("root", {
        type: "server",
        message: "Request failed. Try again.",
      });
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
      <p className="text-xs text-muted-foreground">
        Required fields are marked with{" "}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
        .
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id="employeeNumber"
          label="Employee number"
          required
          error={errors.employeeNumber?.message}
        >
          <Input
            id="employeeNumber"
            autoComplete="off"
            disabled={busy}
            aria-required="true"
            {...register("employeeNumber")}
          />
        </Field>
        <Field
          id="status"
          label="Employment status"
          required
          error={errors.status?.message}
        >
          <Select
            id="status"
            disabled={busy}
            aria-required="true"
            {...register("status")}
          >
            {EMPLOYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="firstName"
          label="First name"
          required
          error={errors.firstName?.message}
        >
          <Input
            id="firstName"
            disabled={busy}
            aria-required="true"
            {...register("firstName")}
          />
        </Field>
        <Field
          id="lastName"
          label="Last name"
          required
          error={errors.lastName?.message}
        >
          <Input
            id="lastName"
            disabled={busy}
            aria-required="true"
            {...register("lastName")}
          />
        </Field>
        <Field
          id="jobTitle"
          label="Job title"
          required
          error={errors.jobTitle?.message}
          className="md:col-span-2"
        >
          <Input
            id="jobTitle"
            disabled={busy}
            aria-required="true"
            {...register("jobTitle")}
          />
        </Field>
        <Field
          id="departmentId"
          label="Department"
          required
          error={errors.departmentId?.message}
        >
          <Select
            id="departmentId"
            disabled={busy}
            aria-required="true"
            {...register("departmentId")}
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="countryId"
          label="Country"
          required
          error={errors.countryId?.message}
        >
          <Select
            id="countryId"
            disabled={busy}
            aria-required="true"
            {...register("countryId")}
          >
            <option value="">Select country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="hireDate" label="Hire date" error={errors.hireDate?.message}>
          <Input
            id="hireDate"
            type="date"
            disabled={busy}
            {...register("hireDate")}
          />
        </Field>
      </div>

      {errors.root?.message ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_srgb,var(--destructive)_35%,var(--border))] bg-[color-mix(in_srgb,var(--destructive)_8%,white)] px-3 py-2 text-sm text-destructive"
        >
          {errors.root.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create employee"
              : "Save changes"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required = false,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex items-center gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
